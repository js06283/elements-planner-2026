// Export sheet — gathers tracks for the chosen grouping and offers
// Spotify + Apple Music export buttons.

const { useState: useStateE, useMemo: useMemoE } = React;

function ExportSheet({ open, onClose, request, state, onToast }) {
  // request: { kind: "artist"|"genre"|"person"|"all"|"day", artistId?, genre?, person?, day? }
  const [exporting, setExporting] = useStateE(null); // "spotify" | "apple" | null

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
    } else { // all
      title = "Elements 2026 — The Group Mixtape";
      subtitle = "Every song everyone added";
    }
    // Sort by hearts then recent
    filtered = [...filtered].sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0));
    return { tracks: filtered, title, subtitle, coverTracks: filtered.slice(0, 4) };
  }, [request, state]);

  const handleExport = async (service) => {
    setExporting(service);
    // Simulate the export. Real impl would call Spotify/Apple Music APIs.
    await new Promise(r => setTimeout(r, 1400));
    setExporting(null);
    onToast({
      message: service === "spotify"
        ? `Created Spotify playlist "${title}" · ${tracks.length} tracks`
        : `Saved to Apple Music: "${title}" · ${tracks.length} tracks`,
      kind: service,
    });
    onClose();
  };

  if (!request) return <window.Sheet open={false} onClose={onClose}/>;

  // Aggregate contributors
  const contributors = Array.from(new Set(tracks.map(t => t.addedBy)));

  return (
    <window.Sheet open={open} onClose={onClose}>
      <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Cover */}
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
                letterSpacing: "-0.02em",
                textShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}>{title}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em",
            marginBottom: 10,
          }}>EXPORT PLAYLIST</div>
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

          {/* Service buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={() => handleExport("spotify")} disabled={!tracks.length || exporting} style={{
              flex: 1, minWidth: 200,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "14px 20px", borderRadius: 4,
              background: tracks.length ? "#1DB954" : "rgba(29, 185, 84, 0.3)",
              color: "#0E0B08", border: "none",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: tracks.length ? "pointer" : "not-allowed",
              opacity: exporting === "spotify" ? 0.6 : 1,
            }}>
              <window.SpotifyGlyph size={18}/>
              {exporting === "spotify" ? "Creating playlist…" : "Save to Spotify"}
            </button>
            <button onClick={() => handleExport("apple")} disabled={!tracks.length || exporting} style={{
              flex: 1, minWidth: 200,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "14px 20px", borderRadius: 4,
              background: tracks.length ? "#FA2D48" : "rgba(250, 45, 72, 0.3)",
              color: "#F4EAD8", border: "none",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: tracks.length ? "pointer" : "not-allowed",
              opacity: exporting === "apple" ? 0.6 : 1,
            }}>
              <window.AppleMusicGlyph size={18}/>
              {exporting === "apple" ? "Saving…" : "Save to Apple Music"}
            </button>
          </div>
          <div style={{
            marginTop: 10,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.06em",
          }}>
            BOTH SERVICES SUPPORTED · ALWAYS · NO MATTER WHO'S SHARING
          </div>
        </div>
      </div>

      {/* Track preview */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 12,
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
                }}>{t.duration}</span>
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

function fmtTotal(tracks) {
  let total = 0;
  for (const t of tracks) {
    if (t.duration) {
      const [m, s] = t.duration.split(":").map(Number);
      total += m * 60 + (s || 0);
    }
  }
  if (total === 0) return "—";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

Object.assign(window, { ExportSheet });
