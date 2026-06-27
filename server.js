const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Behind Railway/Vercel's HTTPS-terminating proxy, trust X-Forwarded-* so
// req.protocol reflects the real "https". Otherwise the Spotify redirect_uri
// is built as http:// and Spotify rejects it as "redirect_uri: Unsafe".
app.set("trust proxy", true);

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl:
		process.env.NODE_ENV === "production"
			? { rejectUnauthorized: false }
			: false,
});

app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname), {
	setHeaders(res, filePath) {
		if (filePath.endsWith(".jsx")) {
			res.setHeader("Content-Type", "application/javascript");
		}
	},
}));

const spotifyOAuthStates = new Map();
let spotifyClientToken = null;

function getBaseUrl(req) {
	const configured = process.env.APP_BASE_URL || process.env.PUBLIC_URL;
	if (configured) return configured.replace(/\/$/, "");
	// Prefer the forwarded protocol (first value if it's a comma-separated list)
	// so we always advertise https when fronted by a proxy.
	const forwardedProto = (req.get("x-forwarded-proto") || "").split(",")[0].trim();
	const proto = forwardedProto || req.protocol;
	return `${proto}://${req.get("host")}`;
}

function getSpotifyRedirectUri(req) {
	return (
		process.env.SPOTIFY_REDIRECT_URI ||
		`${getBaseUrl(req)}/api/music/spotify/callback`
	);
}

function requestJson(url, options = {}, body = null) {
	return new Promise((resolve, reject) => {
		// Parse URL explicitly to avoid query-string corruption when https.request
		// merges a URL string with an options object (Node.js behaviour varies).
		const parsed = new URL(url);
		const reqOptions = {
			hostname: parsed.hostname,
			port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
			path: parsed.pathname + parsed.search,
			...options,
		};
		const request = https.request(reqOptions, (response) => {
			let data = "";
			response.on("data", (chunk) => {
				data += chunk;
			});
			response.on("end", () => {
				let json = null;
				try {
					json = data ? JSON.parse(data) : {};
				} catch (error) {
					return reject(new Error(`Invalid JSON from ${url}: ${data}`));
				}
				if (response.statusCode < 200 || response.statusCode >= 300) {
					const message =
						json?.error_description ||
						json?.error?.message ||
						json?.error ||
						data ||
						response.statusMessage;
					console.error(`[spotify] ${response.statusCode} from ${reqOptions.path} — raw: ${data}`);
					return reject(new Error(`HTTP ${response.statusCode}: ${message}`));
				}
				resolve(json);
			});
		});
		request.on("error", reject);
		if (body) request.write(body);
		request.end();
	});
}

async function getSpotifyClientToken() {
	if (
		spotifyClientToken &&
		spotifyClientToken.expiresAt > Date.now() + 60 * 1000
	) {
		return spotifyClientToken.accessToken;
	}

	const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
	if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
		throw new Error("Spotify search is not configured.");
	}

	const body = "grant_type=client_credentials";
	const auth = Buffer.from(
		`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
	).toString("base64");
	const data = await requestJson(
		"https://accounts.spotify.com/api/token",
		{
			method: "POST",
			headers: {
				Authorization: `Basic ${auth}`,
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": Buffer.byteLength(body),
			},
		},
		body
	);

	spotifyClientToken = {
		accessToken: data.access_token,
		expiresAt: Date.now() + data.expires_in * 1000,
	};
	return spotifyClientToken.accessToken;
}

function parseCookies(req) {
	const raw = req.headers.cookie || "";
	return raw.split(";").reduce((cookies, part) => {
		const index = part.indexOf("=");
		if (index === -1) return cookies;
		const key = part.slice(0, index).trim();
		const value = part.slice(index + 1).trim();
		cookies[key] = decodeURIComponent(value);
		return cookies;
	}, {});
}

function setSpotifyTokenCookie(res, accessToken, expiresIn) {
	const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
	res.setHeader(
		"Set-Cookie",
		`spotify_access_token=${encodeURIComponent(
			accessToken
		)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.max(
			60,
			expiresIn || 3600
		)}${secure}`
	);
}

async function spotifyApi(pathname, accessToken, options = {}) {
	const body = options.body ? JSON.stringify(options.body) : null;
	return requestJson(
		`https://api.spotify.com/v1${pathname}`,
		{
			method: options.method || "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				...(body ? { "Content-Type": "application/json" } : {}),
				...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
			},
		},
		body
	);
}

function normalizeMusicTrack(row) {
	return {
		id: row.id,
		showId: row.show_id,
		contributorName: row.contributor_name,
		spotifyTrackId: row.spotify_track_id,
		spotifyUri: row.spotify_uri,
		spotifyUrl: row.spotify_url,
		title: row.title,
		artists: row.artists || [],
		album: row.album,
		artworkUrl: row.artwork_url,
		durationMs: row.duration_ms,
		isrc: row.isrc,
		genre: row.genre,
		lineupArtist: row.lineup_artist,
		timestamp: row.timestamp,
	};
}

function mapSpotifyTrack(item) {
	const image = item.album?.images?.[0] || item.album?.images?.slice(-1)[0] || null;
	return {
		spotifyTrackId: item.id,
		spotifyUri: item.uri,
		spotifyUrl: item.external_urls?.spotify || "",
		title: item.name,
		artists: (item.artists || []).map((artist) => artist.name),
		album: item.album?.name || "",
		artworkUrl: image?.url || "",
		durationMs: item.duration_ms || 0,
		isrc: item.external_ids?.isrc || "",
	};
}

async function initDb() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS attendees (
			show_id TEXT NOT NULL,
			attendee_name TEXT NOT NULL,
			state TEXT NOT NULL DEFAULT 'normal',
			timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (show_id, attendee_name)
		);
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS comments (
			id BIGSERIAL PRIMARY KEY,
			show_id TEXT NOT NULL,
			name TEXT NOT NULL,
			text TEXT NOT NULL,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS music_tracks (
			id BIGSERIAL PRIMARY KEY,
			show_id TEXT NOT NULL,
			contributor_name TEXT NOT NULL,
			spotify_track_id TEXT NOT NULL,
			spotify_uri TEXT NOT NULL,
			spotify_url TEXT NOT NULL,
			title TEXT NOT NULL,
			artists JSONB NOT NULL DEFAULT '[]'::jsonb,
			album TEXT NOT NULL DEFAULT '',
			artwork_url TEXT NOT NULL DEFAULT '',
			duration_ms INTEGER NOT NULL DEFAULT 0,
			isrc TEXT NOT NULL DEFAULT '',
			genre TEXT NOT NULL DEFAULT '',
			lineup_artist TEXT NOT NULL DEFAULT '',
			timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (show_id, spotify_track_id)
		);
	`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS app_state (
			key TEXT PRIMARY KEY,
			data JSONB NOT NULL DEFAULT '{}'::jsonb,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);
}

function parseCsvLine(line) {
	const values = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === "," && !inQuotes) {
			values.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}

	values.push(current.trim());
	return values;
}

function getDayNumber(day) {
	const normalizedDay = String(day || "").toLowerCase();
	if (normalizedDay.includes("friday")) return 1;
	if (normalizedDay.includes("saturday")) return 2;
	if (normalizedDay.includes("sunday")) return 3;
	return 1;
}

function toSlug(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function toLegacyStageSlug(stage) {
	return String(stage || "").toLowerCase().replace(/\s+/g, "-");
}

function toLegacyArtistSlug(artist) {
	return String(artist || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function normalizeExplicitId(sourceId) {
	const normalized = String(sourceId || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	if (!normalized) return "";
	return normalized.startsWith("show_") ? normalized : `show_${normalized}`;
}

function generateLegacyShowId(day, stage, artist, time) {
	const dayNum = getDayNumber(day);
	const stageSlug = toLegacyStageSlug(stage);
	const artistSlug = toLegacyArtistSlug(artist);
	const timeSlug = String(time || "").replace(/[^a-z0-9]/gi, "");
	return `show_${dayNum}_${stageSlug}_${artistSlug}_${timeSlug}`;
}

function parseScheduleRows(csvText) {
	const lines = String(csvText || "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) return [];

	const headers = parseCsvLine(lines[0]).map((header) =>
		header.replace(/^\ufeff/, "").trim().toLowerCase()
	);
	const dayIndex = headers.indexOf("day");
	const timeIndex = headers.indexOf("time");
	const stageIndex = headers.indexOf("stage");
	const artistIndex = headers.indexOf("artist");
	const genreIndex = headers.indexOf("genre");
	const idIndex = headers.indexOf("id");

	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		const values = parseCsvLine(lines[i]);
		const day = (values[dayIndex >= 0 ? dayIndex : 0] || "").trim();
		const time = (values[timeIndex >= 0 ? timeIndex : 1] || "").trim();
		const stage = (values[stageIndex >= 0 ? stageIndex : 2] || "").trim();
		const artist = (values[artistIndex >= 0 ? artistIndex : 3] || "").trim();
		const genre = (values[genreIndex >= 0 ? genreIndex : 4] || "").trim();
		const sourceId = (values[idIndex >= 0 ? idIndex : -1] || "").trim();
		if (day && time && stage && artist) {
			rows.push({ day, time, stage, artist, genre, sourceId });
		}
	}
	return rows;
}

function getScheduleRows() {
	const scheduleCsvPath = path.join(__dirname, "ultra_2026_inferred_schedule.csv");
	if (!fs.existsSync(scheduleCsvPath)) return [];
	return parseScheduleRows(fs.readFileSync(scheduleCsvPath, "utf8"));
}

function getScheduleByShowId() {
	const rows = getScheduleRows();
	const counters = new Map();
	const shows = new Map();

	for (const row of rows) {
		const dayNum = getDayNumber(row.day);
		const explicitId = normalizeExplicitId(row.sourceId);
		let showId = explicitId;
		if (!showId) {
			const stageSlug = toSlug(row.stage);
			const artistSlug = toSlug(row.artist);
			const key = `${dayNum}|${stageSlug}|${artistSlug}`;
			const occurrence = (counters.get(key) || 0) + 1;
			counters.set(key, occurrence);
			showId = `show_${dayNum}_${stageSlug}_${artistSlug}_${occurrence}`;
		}
		shows.set(showId, row);
	}

	return shows;
}

function buildShowIdMappings(rows) {
	const counters = new Map();
	const byOldId = new Map();

	for (const row of rows) {
		const dayNum = getDayNumber(row.day);
		const oldId = generateLegacyShowId(row.day, row.stage, row.artist, row.time);
		const explicitId = normalizeExplicitId(row.sourceId);
		let newId = explicitId;

		if (!newId) {
			const stageSlug = toSlug(row.stage);
			const artistSlug = toSlug(row.artist);
			const key = `${dayNum}|${stageSlug}|${artistSlug}`;
			const occurrence = (counters.get(key) || 0) + 1;
			counters.set(key, occurrence);
			newId = `show_${dayNum}_${stageSlug}_${artistSlug}_${occurrence}`;
		}

		byOldId.set(oldId, newId);
	}

	return Array.from(byOldId.entries())
		.filter(([oldId, newId]) => oldId !== newId)
		.map(([oldId, newId]) => ({ oldId, newId }));
}

app.get("/api/health", async (_req, res) => {
	try {
		await pool.query("SELECT 1");
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ ok: false, error: error.message });
	}
});

app.get("/api/attendees", async (_req, res) => {
	const result = await pool.query(
		"SELECT show_id, attendee_name, state, timestamp FROM attendees"
	);
	res.json({
		attendees: result.rows.map((r) => ({
			showId: r.show_id,
			attendeeName: r.attendee_name,
			state: r.state,
			timestamp: r.timestamp,
		})),
	});
});

app.get("/api/attendees/show/:showId", async (req, res) => {
	const result = await pool.query(
		"SELECT attendee_name FROM attendees WHERE show_id = $1",
		[req.params.showId]
	);
	res.json({ attendees: result.rows.map((r) => r.attendee_name) });
});

app.get("/api/attendees/person/:name", async (req, res) => {
	const result = await pool.query(
		"SELECT show_id FROM attendees WHERE attendee_name = $1 AND state != 'deleted'",
		[req.params.name]
	);
	res.json({ shows: result.rows.map((r) => r.show_id) });
});

app.put("/api/attendees", async (req, res) => {
	const { showId, attendeeName, state = "normal" } = req.body;
	await pool.query(
		`INSERT INTO attendees (show_id, attendee_name, state, timestamp)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (show_id, attendee_name)
		 DO UPDATE SET state = EXCLUDED.state, timestamp = NOW()`,
		[showId, attendeeName, state]
	);
	res.json({ ok: true });
});

app.delete("/api/attendees", async (req, res) => {
	const { showId, attendeeName } = req.body;
	await pool.query(
		"DELETE FROM attendees WHERE show_id = $1 AND attendee_name = $2",
		[showId, attendeeName]
	);
	res.json({ ok: true });
});

app.get("/api/comments", async (_req, res) => {
	const result = await pool.query(
		"SELECT id, show_id, name, text, timestamp FROM comments ORDER BY timestamp ASC"
	);
	res.json({
		comments: result.rows.map((r) => ({
			id: r.id,
			showId: r.show_id,
			name: r.name,
			text: r.text,
			timestamp: r.timestamp,
		})),
	});
});

app.post("/api/comments", async (req, res) => {
	const { showId, name, text, timestamp } = req.body;
	await pool.query(
		"INSERT INTO comments (show_id, name, text, timestamp) VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))",
		[showId, name, text, timestamp || null]
	);
	res.json({ ok: true });
});

app.post("/api/comments/delete", async (req, res) => {
	const { showId, commentIndex } = req.body;
	const result = await pool.query(
		"SELECT id FROM comments WHERE show_id = $1 ORDER BY timestamp ASC, id ASC",
		[showId]
	);
	const row = result.rows[commentIndex];
	if (!row) return res.status(404).json({ ok: false, error: "Comment not found" });

	await pool.query("DELETE FROM comments WHERE id = $1", [row.id]);
	res.json({ ok: true });
});

app.get("/api/music/search", async (req, res) => {
	try {
		const showId = String(req.query.showId || "");
		const userQuery = String(req.query.q || "").trim();
		// Accept an explicit artist name param (used by the React app which doesn't use showId)
		const artistParam = String(req.query.artist || "").trim();
		const schedule = getScheduleByShowId();
		const show = schedule.get(showId);
		const lineupArtist = artistParam || show?.artist || "";
		const query = [lineupArtist, userQuery].filter(Boolean).join(" ");

		if (!query) {
			return res.status(400).json({ error: "Search query is required." });
		}

		const token = await getSpotifyClientToken();
		const searchPath = `/search?q=${encodeURIComponent(query)}&type=track`;
		const data = await spotifyApi(searchPath, token);
		res.json({
			tracks: (data.tracks?.items || []).map(mapSpotifyTrack),
			query,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Export a playlist from URIs provided directly by the client (used by the React app).
// First call returns { requiresAuth, authUrl } if the user hasn't authed yet.
// After OAuth callback the client retries and gets { ok, playlistUrl, trackCount }.
app.post("/api/music/export/spotify/direct", async (req, res) => {
	try {
		const { name, description, uris } = req.body || {};
		if (!name || !Array.isArray(uris) || uris.length === 0) {
			return res.status(400).json({ error: "name and uris[] are required." });
		}

		const cookies = parseCookies(req);
		const accessToken = cookies.spotify_access_token;
		if (!accessToken) {
			if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
				return res.status(500).json({ error: "Spotify OAuth is not configured." });
			}
			const state = crypto.randomBytes(18).toString("hex");
			// Store the full export request so we can resume after auth
			spotifyOAuthStates.set(state, { name, description, uris, createdAt: Date.now() });
			const redirectUri = getSpotifyRedirectUri(req);
			const params = new URLSearchParams({
				client_id: process.env.SPOTIFY_CLIENT_ID,
				response_type: "code",
				redirect_uri: redirectUri,
				scope: "playlist-modify-private",
				state,
			});
			return res.json({
				requiresAuth: true,
				authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
			});
		}

		const playlist = await spotifyApi("/me/playlists", accessToken, {
			method: "POST",
			body: {
				name,
				description: description || "Created via Elements 2026 planner.",
				public: false,
			},
		});

		for (let i = 0; i < uris.length; i += 100) {
			await spotifyApi(`/playlists/${playlist.id}/tracks`, accessToken, {
				method: "POST",
				body: { uris: uris.slice(i, i + 100) },
			});
		}

		res.json({
			ok: true,
			playlistId: playlist.id,
			playlistUrl: playlist.external_urls?.spotify,
			trackCount: uris.length,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/music/tracks", async (_req, res) => {
	const result = await pool.query(
		"SELECT * FROM music_tracks ORDER BY timestamp ASC, id ASC"
	);
	res.json({ tracks: result.rows.map(normalizeMusicTrack) });
});

app.get("/api/music/tracks/show/:showId", async (req, res) => {
	const result = await pool.query(
		"SELECT * FROM music_tracks WHERE show_id = $1 ORDER BY timestamp ASC, id ASC",
		[req.params.showId]
	);
	res.json({ tracks: result.rows.map(normalizeMusicTrack) });
});

app.post("/api/music/tracks", async (req, res) => {
	const {
		showId,
		contributorName,
		spotifyTrackId,
		spotifyUri,
		spotifyUrl,
		title,
		artists = [],
		album = "",
		artworkUrl = "",
		durationMs = 0,
		isrc = "",
	} = req.body || {};

	if (!showId || !contributorName || !spotifyTrackId || !spotifyUri || !title) {
		return res.status(400).json({ error: "Missing required track fields." });
	}

	const schedule = getScheduleByShowId();
	const show = schedule.get(showId);
	const result = await pool.query(
		`INSERT INTO music_tracks (
			show_id, contributor_name, spotify_track_id, spotify_uri, spotify_url,
			title, artists, album, artwork_url, duration_ms, isrc, genre, lineup_artist,
			timestamp
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, NOW())
		ON CONFLICT (show_id, spotify_track_id)
		DO UPDATE SET
			contributor_name = EXCLUDED.contributor_name,
			spotify_uri = EXCLUDED.spotify_uri,
			spotify_url = EXCLUDED.spotify_url,
			title = EXCLUDED.title,
			artists = EXCLUDED.artists,
			album = EXCLUDED.album,
			artwork_url = EXCLUDED.artwork_url,
			duration_ms = EXCLUDED.duration_ms,
			isrc = EXCLUDED.isrc,
			genre = EXCLUDED.genre,
			lineup_artist = EXCLUDED.lineup_artist,
			timestamp = NOW()
		RETURNING *`,
		[
			showId,
			contributorName,
			spotifyTrackId,
			spotifyUri,
			spotifyUrl || `https://open.spotify.com/track/${spotifyTrackId}`,
			title,
			JSON.stringify(Array.isArray(artists) ? artists : []),
			album,
			artworkUrl,
			Number(durationMs) || 0,
			isrc,
			show?.genre || "",
			show?.artist || "",
		]
	);
	res.json({ track: normalizeMusicTrack(result.rows[0]) });
});

app.delete("/api/music/tracks/:id", async (req, res) => {
	const contributorName = String(req.body?.contributorName || "").trim();
	if (!contributorName) {
		return res.status(400).json({ error: "Contributor name is required." });
	}

	const result = await pool.query(
		"DELETE FROM music_tracks WHERE id = $1 AND contributor_name = $2 RETURNING id",
		[req.params.id, contributorName]
	);
	if (!result.rowCount) {
		return res.status(404).json({ error: "Track not found for contributor." });
	}
	res.json({ ok: true });
});

app.get("/api/music/genres", async (_req, res) => {
	const result = await pool.query(`
		SELECT
			COALESCE(NULLIF(genre, ''), 'Uncategorized') AS genre,
			COUNT(*)::int AS track_count,
			COUNT(DISTINCT show_id)::int AS show_count
		FROM music_tracks
		GROUP BY COALESCE(NULLIF(genre, ''), 'Uncategorized')
		ORDER BY genre ASC
	`);
	res.json({ genres: result.rows });
});

app.post("/api/music/export/spotify", async (req, res) => {
	try {
		const genre = String(req.body?.genre || "").trim();
		if (!genre) return res.status(400).json({ error: "Genre is required." });

		const cookies = parseCookies(req);
		const accessToken = cookies.spotify_access_token;
		if (!accessToken) {
			const state = crypto.randomBytes(18).toString("hex");
			spotifyOAuthStates.set(state, { genre, createdAt: Date.now() });
			const redirectUri = getSpotifyRedirectUri(req);
			const params = new URLSearchParams({
				client_id: process.env.SPOTIFY_CLIENT_ID || "",
				response_type: "code",
				redirect_uri: redirectUri,
				scope: "playlist-modify-private",
				state,
			});
			if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
				return res.status(500).json({ error: "Spotify OAuth is not configured." });
			}
			return res.json({
				requiresAuth: true,
				authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
			});
		}

		const result = await pool.query(
			`SELECT DISTINCT ON (spotify_track_id) spotify_uri
			 FROM music_tracks
			 WHERE COALESCE(NULLIF(genre, ''), 'Uncategorized') = $1
			 ORDER BY spotify_track_id, timestamp ASC`,
			[genre]
		);
		const uris = result.rows.map((row) => row.spotify_uri).filter(Boolean);
		if (!uris.length) {
			return res.status(400).json({ error: "No Spotify tracks for this genre." });
		}

		const playlist = await spotifyApi("/me/playlists", accessToken, {
			method: "POST",
			body: {
				name: `Elements 2026 - ${genre}`,
				description: `Group picks from the Elements 2026 planner.`,
				public: false,
			},
		});

		for (let i = 0; i < uris.length; i += 100) {
			await spotifyApi(`/playlists/${playlist.id}/tracks`, accessToken, {
				method: "POST",
				body: { uris: uris.slice(i, i + 100) },
			});
		}

		res.json({
			ok: true,
			playlistId: playlist.id,
			playlistUrl: playlist.external_urls?.spotify,
			trackCount: uris.length,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/music/spotify/callback", async (req, res) => {
	try {
		const code = String(req.query.code || "");
		const state = String(req.query.state || "");
		const saved = spotifyOAuthStates.get(state);
		spotifyOAuthStates.delete(state);
		if (!code || !saved || Date.now() - saved.createdAt > 10 * 60 * 1000) {
			return res.redirect("/?spotifyExportError=invalid_state");
		}

		const redirectUri = getSpotifyRedirectUri(req);
		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
		}).toString();
		const auth = Buffer.from(
			`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
		).toString("base64");
		const token = await requestJson(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				headers: {
					Authorization: `Basic ${auth}`,
					"Content-Type": "application/x-www-form-urlencoded",
					"Content-Length": Buffer.byteLength(body),
				},
			},
			body
		);

		setSpotifyTokenCookie(res, token.access_token, token.expires_in);
		// Direct export (from React app) — pass resume params in URL so frontend retries
		if (saved.uris) {
			const resume = encodeURIComponent(JSON.stringify({ name: saved.name, description: saved.description, uris: saved.uris }));
			return res.redirect(`/?spotifyDirectResume=${resume}&spotifyAuthed=1`);
		}
		res.redirect(
			`/?spotifyExportGenre=${encodeURIComponent(saved.genre)}&spotifyAuthed=1`
		);
	} catch (error) {
		res.redirect(`/?spotifyExportError=${encodeURIComponent(error.message)}`);
	}
});

app.post("/api/clear", async (_req, res) => {
	await pool.query("DELETE FROM attendees");
	await pool.query("DELETE FROM comments");
	await pool.query("DELETE FROM music_tracks");
	res.json({ ok: true });
});

app.get("/api/export", async (_req, res) => {
	const [attendeesResult, commentsResult, musicResult] = await Promise.all([
		pool.query("SELECT show_id, attendee_name, state FROM attendees"),
		pool.query("SELECT show_id, name, text, timestamp FROM comments"),
		pool.query("SELECT * FROM music_tracks ORDER BY timestamp ASC, id ASC"),
	]);

	const attendees = {};
	const attendeeStates = {};
	attendeesResult.rows.forEach((r) => {
		if (!attendees[r.show_id]) attendees[r.show_id] = [];
		attendees[r.show_id].push(r.attendee_name);
		if (!attendeeStates[r.show_id]) attendeeStates[r.show_id] = {};
		attendeeStates[r.show_id][r.attendee_name] = r.state;
	});

	const comments = {};
	commentsResult.rows.forEach((r) => {
		if (!comments[r.show_id]) comments[r.show_id] = [];
		comments[r.show_id].push({
			name: r.name,
			text: r.text,
			timestamp: r.timestamp,
		});
	});

	res.json({
		attendees,
		attendeeStates,
		comments,
		musicTracks: musicResult.rows.map(normalizeMusicTrack),
	});
});

app.post("/api/import", async (req, res) => {
	const {
		attendees = {},
		attendeeStates = {},
		comments = {},
		musicTracks = [],
	} = req.body || {};

	await pool.query("BEGIN");
	try {
		await pool.query("DELETE FROM attendees");
		await pool.query("DELETE FROM comments");
		await pool.query("DELETE FROM music_tracks");

		for (const [showId, names] of Object.entries(attendees)) {
			for (const attendeeName of names) {
				const state = attendeeStates?.[showId]?.[attendeeName] || "normal";
				await pool.query(
					`INSERT INTO attendees (show_id, attendee_name, state, timestamp)
					 VALUES ($1, $2, $3, NOW())
					 ON CONFLICT (show_id, attendee_name)
					 DO UPDATE SET state = EXCLUDED.state, timestamp = NOW()`,
					[showId, attendeeName, state]
				);
			}
		}

		for (const [showId, list] of Object.entries(comments)) {
			for (const comment of list) {
				await pool.query(
					"INSERT INTO comments (show_id, name, text, timestamp) VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))",
					[showId, comment.name, comment.text, comment.timestamp || null]
				);
			}
		}

		for (const track of musicTracks) {
			await pool.query(
				`INSERT INTO music_tracks (
					show_id, contributor_name, spotify_track_id, spotify_uri, spotify_url,
					title, artists, album, artwork_url, duration_ms, isrc, genre,
					lineup_artist, timestamp
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()))
				ON CONFLICT (show_id, spotify_track_id) DO NOTHING`,
				[
					track.showId,
					track.contributorName,
					track.spotifyTrackId,
					track.spotifyUri,
					track.spotifyUrl,
					track.title,
					JSON.stringify(Array.isArray(track.artists) ? track.artists : []),
					track.album || "",
					track.artworkUrl || "",
					Number(track.durationMs) || 0,
					track.isrc || "",
					track.genre || "",
					track.lineupArtist || "",
					track.timestamp || null,
				]
			);
		}

		await pool.query("COMMIT");
		res.json({ ok: true });
	} catch (error) {
		await pool.query("ROLLBACK");
		res.status(500).json({ ok: false, error: error.message });
	}
});

app.post("/api/admin/migrate-show-ids", async (req, res) => {
	const token = req.get("x-migration-token") || req.body?.token || req.query?.token;
	if (process.env.MIGRATION_TOKEN && token !== process.env.MIGRATION_TOKEN) {
		return res.status(403).json({ ok: false, error: "Invalid migration token" });
	}

	const dryRun = Boolean(req.body?.dryRun);
	const scheduleCsvPath = req.body?.scheduleCsvPath
		? path.resolve(__dirname, req.body.scheduleCsvPath)
		: path.join(__dirname, "ultra_2026_inferred_schedule.csv");
	const csvText =
		typeof req.body?.csvText === "string" && req.body.csvText.trim()
			? req.body.csvText
			: fs.readFileSync(scheduleCsvPath, "utf8");

	const rows = parseScheduleRows(csvText);
	const mappings = buildShowIdMappings(rows);
	if (!mappings.length) {
		return res.json({
			ok: true,
			dryRun,
			message: "No show ID remap needed.",
			parsedRows: rows.length,
			mappedRows: 0,
		});
	}

	const oldIds = mappings.map((m) => m.oldId);
	const newIds = mappings.map((m) => m.newId);

	const [attendeeMatches, commentMatches] = await Promise.all([
		pool.query(
			"SELECT COUNT(*)::int AS count FROM attendees WHERE show_id = ANY($1::text[])",
			[oldIds]
		),
		pool.query(
			"SELECT COUNT(*)::int AS count FROM comments WHERE show_id = ANY($1::text[])",
			[oldIds]
		),
	]);

	if (dryRun) {
		return res.json({
			ok: true,
			dryRun: true,
			parsedRows: rows.length,
			mappedRows: mappings.length,
			matchedAttendees: attendeeMatches.rows[0].count,
			matchedComments: commentMatches.rows[0].count,
			sample: mappings.slice(0, 20),
		});
	}

	await pool.query("BEGIN");
	try {
		await pool.query(`
			CREATE TEMP TABLE id_migration_map (
				old_id TEXT PRIMARY KEY,
				new_id TEXT NOT NULL
			) ON COMMIT DROP
		`);
		await pool.query(
			`INSERT INTO id_migration_map (old_id, new_id)
			 SELECT * FROM UNNEST($1::text[], $2::text[])`,
			[oldIds, newIds]
		);

		await pool.query(`
			CREATE TEMP TABLE attendees_snapshot ON COMMIT DROP AS
			SELECT
				COALESCE(m.new_id, a.show_id) AS show_id,
				a.attendee_name,
				a.state,
				a.timestamp
			FROM attendees a
			LEFT JOIN id_migration_map m ON m.old_id = a.show_id
		`);

		await pool.query("DELETE FROM attendees");
		await pool.query(`
			INSERT INTO attendees (show_id, attendee_name, state, timestamp)
			SELECT DISTINCT ON (show_id, attendee_name)
				show_id,
				attendee_name,
				state,
				timestamp
			FROM attendees_snapshot
			ORDER BY show_id, attendee_name, timestamp DESC
		`);

		await pool.query(`
			UPDATE comments c
			SET show_id = m.new_id
			FROM id_migration_map m
			WHERE c.show_id = m.old_id
		`);

		await pool.query("COMMIT");

		res.json({
			ok: true,
			dryRun: false,
			parsedRows: rows.length,
			mappedRows: mappings.length,
			matchedAttendees: attendeeMatches.rows[0].count,
			matchedComments: commentMatches.rows[0].count,
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		res.status(500).json({ ok: false, error: error.message });
	}
});

// Shared React app state — fans, songs, comments, reactions (keyed by art-N ids)
app.get("/api/app-state", async (_req, res) => {
	try {
		const result = await pool.query(
			"SELECT data FROM app_state WHERE key = 'elements26'"
		);
		res.json(result.rows[0]?.data || {});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.put("/api/app-state", async (req, res) => {
	try {
		const { fans, mustSeeByArtist, curiousByArtist, songsByArtist, commentsByArtist, vibePositions, extraFriends, profiles } = req.body;
		const data = {
			fans: fans || {},
			mustSeeByArtist: mustSeeByArtist || {},
			curiousByArtist: curiousByArtist || {},
			songsByArtist: songsByArtist || {},
			commentsByArtist: commentsByArtist || {},
			vibePositions: vibePositions || {},
			extraFriends: extraFriends || [],
			profiles: profiles || {},
		};
		await pool.query(
			`INSERT INTO app_state (key, data, updated_at)
			 VALUES ('elements26', $1::jsonb, NOW())
			 ON CONFLICT (key)
			 DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
			[JSON.stringify(data)]
		);
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// One-time migration: remap index-based artist IDs → stable name-based slugs.
// Call POST /api/migrate-artist-ids once, then this endpoint can be removed.
app.post("/api/migrate-artist-ids", async (req, res) => {
	try {
		// Maps old art-N → new art-slug (using corrected artist names)
		const ID_MAP = {
			"art-0":  "art-above-beyond",
			"art-1":  "art-atliens",
			"art-2":  "art-big-gigantic",
			"art-3":  "art-boys-noize",
			"art-4":  "art-chris-lake",
			"art-5":  "art-crankdat",
			"art-6":  "art-excision",
			"art-7":  "art-ganja-white-night",
			"art-8":  "art-its-murph",
			"art-9":  "art-jigitz",
			"art-10": "art-kettama",
			"art-11": "art-mersiv",
			"art-12": "art-zingara",
			"art-13": "art-dirtwire",       // was "Driftire"
			"art-14": "art-dreya-v",
			"art-15": "art-effin",
			"art-16": "art-gorillat",
			"art-17": "art-ivy-lab",
			"art-18": "art-kaleena-zanders",
			"art-19": "art-lumasi",
			"art-20": "art-mcrt",
			"art-21": "art-splintered-sunlight",
			"art-22": "art-wonkywilla",
			"art-23": "art-x-club",
			"art-24": "art-ammo-amor",
			"art-25": "art-bardz",
			"art-26": "art-gavin-black",
			"art-27": "art-jellybean",
			"art-28": "art-kattana",
			"art-29": "art-a-trak",
			"art-30": "art-ayybo",
			"art-31": "art-cloonee",
			"art-32": "art-clozee",
			"art-33": "art-hedex",
			"art-34": "art-hol",
			"art-35": "art-level-up",
			"art-36": "art-louis-the-child",
			"art-37": "art-matroda",
			"art-38": "art-mph",
			"art-39": "art-of-the-trees",
			"art-40": "art-ray-volpe",
			"art-41": "art-subtronics",
			"art-42": "art-svdden-death",
			"art-43": "art-westend",
			"art-44": "art-biscuits",
			"art-45": "art-disciple",
			"art-46": "art-linska",
			"art-47": "art-nikita-the-wicked",
			"art-48": "art-opiou",           // was "Opio"
			"art-49": "art-probcause",
			"art-50": "art-roddy-lima",
			"art-51": "art-sippy",
			"art-52": "art-skysia",
			"art-53": "art-9b49",            // was "98.49"
			"art-54": "art-alec-b2b-ecamp",
			"art-55": "art-earth-signs",
			"art-56": "art-miel",
			"art-57": "art-pafyon",
			"art-58": "art-refrakt",
			"art-59": "art-sirens",
			"art-60": "art-acraze",
			"art-61": "art-charlotte-de-witte",
			"art-62": "art-daily-bread",
			"art-63": "art-i-hate-models",
			"art-64": "art-lsdream",
			"art-65": "art-porter-robinson",
			"art-66": "art-sub-focus",
			"art-67": "art-tiga",
			"art-68": "art-tractorbeam",
			"art-69": "art-walker-royce",
			"art-70": "art-ydg",
			"art-71": "art-azzecca",         // was "Azecca"
			"art-72": "art-chyl",
			"art-73": "art-golden-pony",
			"art-74": "art-jackie-hollander",
			"art-75": "art-know-good",
			"art-76": "art-marvel-years",
			"art-77": "art-thought-process",
			"art-78": "art-will-clarke",
			"art-79": "art-barz",
			"art-80": "art-dr-chunga",
			"art-81": "art-koopmusik",
			"art-82": "art-luna-mar",
			"art-83": "art-pynth",
		};

		function remapKeys(obj) {
			if (!obj || typeof obj !== "object") return obj;
			const out = {};
			for (const [k, v] of Object.entries(obj)) {
				out[ID_MAP[k] || k] = v;
			}
			return out;
		}

		const result = await pool.query("SELECT data FROM app_state WHERE key = 'elements26'");
		const old = result.rows[0]?.data || {};

		const migrated = {
			fans:              remapKeys(old.fans || {}),
			mustSeeByArtist:   remapKeys(old.mustSeeByArtist || {}),
			curiousByArtist:   remapKeys(old.curiousByArtist || {}),
			songsByArtist:     remapKeys(old.songsByArtist || {}),
			commentsByArtist:  remapKeys(old.commentsByArtist || {}),
			vibePositions:     old.vibePositions || {},
			extraFriends:      old.extraFriends || [],
			profiles:          old.profiles || {},
		};

		await pool.query(
			`INSERT INTO app_state (key, data, updated_at)
			 VALUES ('elements26', $1::jsonb, NOW())
			 ON CONFLICT (key)
			 DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
			[JSON.stringify(migrated)]
		);

		res.json({ ok: true, mapped: Object.keys(ID_MAP).length });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get("*", (_req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
	.then(() => {
		app.listen(port, () => {
			console.log(`Server listening on port ${port}`);
		});
	})
	.catch((error) => {
		console.warn("Database unavailable — running without sync:", error.message);
		app.listen(port, () => {
			console.log(`Server listening on port ${port} (no DB)`);
		});
	});
