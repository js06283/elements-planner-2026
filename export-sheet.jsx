// Export sheet — real Spotify playlist creation via OAuth.

const { useState: useStateE, useMemo: useMemoE, useEffect: useEffectE } = React;

// The vibe "suggest playlist" recommends only the top N songs, not the entire catalog.
const VIBE_PLAYLIST_LIMIT = 20;

function ExportSheet({ open, onClose, request, state, onToast, onRetryExport }) {
  // request: { kind: "artist"|"genre"|"person"|"all"|"day", artistId?, genre?, person?, day? }
  const [exporting, setExporting] = useStateE(false);
  const [error, setError] = useStateE(null);

  const { tracks, title, subtitle, coverTracks } = useMemoE(() => {
    if (!request) return { tracks: [], title: "", subtitle: "", coverTracks: [] };
    const all = [];
    for (const [artistId, songs] of Object.entries(state.songsByArtist)) {
      const a = window.ARTISTS.find(x => x.id === artistId);
      if (!a) continue;
      for (const s of songs) {
        all.push({ ...s, artist: a.artist, artistId, genre: a.genre, day: a.day });
      }
    }
    let filtered = all;
    let title = "", subtitle = "";
    if (request.kind === "artist") {
      const a = window.ARTISTS.find(x => x.id === request.artistId);
      filtered = all.filter(t => t.artistId === request.artistId);
      title = a?.artist || "Artist";
      subtitle = `Group picks · ${a?.day} · ${a?.genre}`;
    } else if (request.kind === "genre") {
      filtered = all.filter(t => t.genre === request.genre);
      title = request.genre;
      subtitle = `Every ${request.genre.toLowerCase()} song the group added`;
    } else if (request.kind === "person") {
      filtered = all.filter(t => t.addedBy === request.person);
      title = `${request.person}'s Picks`;
      subtitle = `Everything ${request.person} added across all artists`;
    } else if (request.kind === "day") {
      filtered = all.filter(t => t.day === request.day);
      title = `${request.day} Mixtape`;
      subtitle = `Every song attached to a ${request.day} artist`;
    } else if (request.kind === "vibe") {
      const rankedIds = request.vibeRankedArtistIds || [];
      const byArtist = {};
      for (const s of all) {
        if (!byArtist[s.artistId]) byArtist[s.artistId] = [];
        byArtist[s.artistId].push(s);
      }
      filtered = rankedIds.flatMap(id =>
        (byArtist[id] || []).sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0))
      ).slice(0, VIBE_PLAYLIST_LIMIT); // recommend only the top picks, not every song
      title = `${request.person}'s Vibe Playlist`;
      subtitle = `Top ${VIBE_PLAYLIST_LIMIT} by vibe match · Elements 2026`;
    } else {
      title = "Elements 2026 — The Group Mixtape";
      subtitle = "Every song everyone added";
    }
    if (request.kind !== "vibe") {
      filtered = [...filtered].sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0));
    }
    return { tracks: filtered, title, subtitle, coverTracks: filtered.slice(0, 4) };
  }, [request, state]);

  // Reset error when sheet opens
  useEffectE(() => { if (open) setError(null); }, [open]);

  const handleExport = async () => {
    const uris = tracks.map(t => t.spotifyUri).filter(Boolean);
    if (!uris.length) {
      setError("No Spotify tracks to export. Add songs via the Spotify search first.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/music/export/spotify/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description: `Elements 2026 group picks — ${subtitle}`,
          uris,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed.");

      if (data.requiresAuth) {
        // Store export intent so we can resume after OAuth
        sessionStorage.setItem("spotifyExportPending", JSON.stringify({ name: title, description: subtitle, uris }));
        // Redirect same-tab so the cookie is set on callback
        window.location.href = data.authUrl;
        return;
      }

      onToast({ message: `Playlist "${title}" created · ${data.trackCount} tracks`, kind: "spotify" });
      if (data.playlistUrl) window.open(data.playlistUrl, "_blank", "noopener");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!request) return <window.Sheet open={false} onClose={onClose}/>;

  const contributors = Array.from(new Set(tracks.map(t => t.addedBy).filter(Boolean)));
  const exportableCount = tracks.filter(t => t.spotifyUri).length;
  const hasNonSpotify = tracks.length > exportableCount;

  return (
    <window.Sheet open={open} onClose={onClose}>
      <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Cover collage */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ width: 180, height: 180, position: "relative" }}>
            <window.AlbumCollage tracks={coverTracks} size={180}/>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(14,11,8,0) 50%, rgba(14,11,8,0.8) 100%)",
              padding: 14, display: "flex", alignItems: "flex-end",
            }}>
              <div style={{
                fontFamily: "'Bricolage Grotesque', serif", fontWeight: 800,
                fontSize: 18, lineHeight: 0.95, color: "#F4EAD8",
                letterSpacing: "-0.02em", textShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}>{title}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em", marginBottom: 10,
          }}>EXPORT TO SPOTIFY</div>
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
            fontSize: 32, lineHeight: 1.05, color: "#F4EAD8",
            margin: 0, letterSpacing: "-0.02em",
          }}>{title}</h2>
          <p style={{ marginTop: 8, color: "rgba(244, 234, 216, 0.55)", fontSize: 14 }}>{subtitle}</p>

          <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
            <Stat2 label="Tracks" value={tracks.length}/>
            <Stat2 label="Curators" value={contributors.length}/>
            <Stat2 label="Total" value={fmtTotal(tracks)}/>
          </div>

          {hasNonSpotify && (
            <div style={{
              marginTop: 14, padding: "8px 12px",
              background: "rgba(232, 199, 122, 0.08)",
              border: "1px solid rgba(232, 199, 122, 0.25)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#E8C77A", letterSpacing: "0.06em",
            }}>
              {exportableCount}/{tracks.length} TRACKS HAVE SPOTIFY URIS — OTHERS WILL BE SKIPPED
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 12px",
              background: "rgba(232, 85, 63, 0.1)",
              border: "1px solid rgba(232, 85, 63, 0.35)",
              color: "#E8553F", fontSize: 13, borderRadius: 4,
            }}>{error}</div>
          )}

          <button
            onClick={handleExport}
            disabled={!exportableCount || exporting}
            style={{
              marginTop: 20, width: "100%",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "14px 20px", borderRadius: 4,
              background: exportableCount ? "#1DB954" : "rgba(29, 185, 84, 0.3)",
              color: "#0E0B08", border: "none",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: exportableCount ? "pointer" : "not-allowed",
              opacity: exporting ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <window.SpotifyGlyph size={18}/>
            {exporting ? "Creating playlist…" : exportableCount ? `Save to Spotify (${exportableCount} tracks)` : "No Spotify tracks yet"}
          </button>

          <div style={{
            marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.35)", letterSpacing: "0.06em",
          }}>
            YOU'LL BE ASKED TO SIGN INTO SPOTIFY ONCE · PLAYLIST SAVES TO YOUR LIBRARY
          </div>
        </div>
      </div>

      {/* Tracklist preview */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12,
        }}>
          <h3 style={{
            fontFamily: "'Bricolage Grotesque', serif", fontWeight: 600,
            fontSize: 16, color: "#F4EAD8", margin: 0,
          }}>Tracklist</h3>
          {contributors.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <window.AvatarStack names={contributors} size={20} max={6}/>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "rgba(244, 234, 216, 0.5)",
              }}>curated by {contributors.length} {contributors.length === 1 ? "person" : "people"}</span>
            </div>
          )}
        </div>
        {tracks.length === 0 ? (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            color: "rgba(244, 234, 216, 0.4)", fontSize: 13,
            border: "1px dashed rgba(255,255,255,0.1)",
          }}>No tracks for this grouping yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tracks.slice(0, 30).map((t, i) => (
              <div key={`${t.artistId}-${t.id}`} style={{
                display: "grid", gridTemplateColumns: "24px 36px 1fr auto auto", gap: 12,
                alignItems: "center", padding: "6px 8px",
                opacity: t.spotifyUri ? 1 : 0.45,
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "rgba(244, 234, 216, 0.4)", textAlign: "right",
                }}>{i + 1}</span>
                <window.AlbumArt track={t} size={36}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
                    color: "#F4EAD8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{t.title}</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: "rgba(244, 234, 216, 0.45)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{t.artist} · {t.album}</div>
                </div>
                {t.addedBy && <window.Avatar name={t.addedBy} size={18}/>}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "rgba(244, 234, 216, 0.4)",
                }}>{t.duration || fmtMs(t.durationMs)}</span>
              </div>
            ))}
            {tracks.length > 30 && (
              <div style={{
                padding: "10px 8px", textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "rgba(244, 234, 216, 0.4)",
              }}>+ {tracks.length - 30} more tracks</div>
            )}
          </div>
        )}
      </div>
    </window.Sheet>
  );
}

function Stat2({ label, value }) {
  return (
    <div>
      <div style={{
        fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
        fontSize: 22, lineHeight: 1, color: "#F4EAD8", letterSpacing: "-0.01em",
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em", marginTop: 4,
      }}>{label.toUpperCase()}</div>
    </div>
  );
}

function fmtMs(ms) {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtTotal(tracks) {
  let total = 0;
  for (const t of tracks) {
    if (t.duration) {
      const [m, s] = t.duration.split(":").map(Number);
      total += m * 60 + (s || 0);
    } else if (t.durationMs) {
      total += Math.round(t.durationMs / 1000);
    }
  }
  if (total === 0) return "—";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

Object.assign(window, { ExportSheet });
