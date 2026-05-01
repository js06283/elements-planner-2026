// Artist detail modal + Add Song modal (Spotify-style search).

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

function ArtistDetailModal({ open, artist, state, dispatch, currentUser, onClose, onAddSong, onExport }) {
  if (!artist) return null;
  const fans = state.fans[artist.id] || [];
  const songs = state.songsByArtist[artist.id] || [];
  const isFan = fans.includes(currentUser);
  const tint = window.STAGE_TINTS[artist.stage];

  return (
    <window.Modal open={open} onClose={onClose} maxWidth={780}>
      {/* Hero */}
      <div style={{ position: "relative", height: 240, overflow: "hidden", flexShrink: 0 }}>
        <CollageHero tracks={songs.slice(0, 4)} fallback={artist.artist}/>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(14,11,8,0.1) 0%, rgba(14,11,8,0.92) 100%)",
        }}/>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(14, 11, 8, 0.8)", color: "#F4EAD8",
          border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, lineHeight: 1,
        }}>×</button>
        <div style={{ position: "absolute", left: 28, right: 28, bottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <span style={{
              padding: "4px 10px", background: "rgba(14,11,8,0.85)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#F4EAD8", letterSpacing: "0.12em",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>{artist.day.toUpperCase()} · {artist.timeStart}</span>
            <window.StageTag stage={artist.stage}/>
            <span style={{
              padding: "4px 10px", background: "rgba(14,11,8,0.85)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "#F4EAD8", letterSpacing: "0.12em",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>{artist.genre.toUpperCase()}</span>
          </div>
          <h2 style={{
            fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
            fontSize: 44, lineHeight: 0.95, color: "#F4EAD8",
            margin: 0, letterSpacing: "-0.02em",
          }}>{artist.artist}</h2>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {/* Fan + action row */}
        <div style={{
          padding: "20px 28px", display: "flex", alignItems: "center",
          gap: 16, justifyContent: "space-between", flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => dispatch({ type: "toggleFan", artistId: artist.id, user: currentUser })} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 999,
              background: isFan ? "#E8553F" : "transparent",
              color: isFan ? "#0E0B08" : "#F4EAD8",
              border: `1px solid ${isFan ? "#E8553F" : "rgba(255,255,255,0.2)"}`,
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isFan ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {isFan ? "I'm a fan" : "Mark as fan"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {fans.length > 0 ? (
                <>
                  <window.AvatarStack names={fans} size={24} max={6}/>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: "rgba(244, 234, 216, 0.55)",
                  }}>{fans.join(", ")}</span>
                </>
              ) : (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "rgba(244, 234, 216, 0.35)", letterSpacing: "0.06em",
                }}>NO FANS YET</span>
              )}
            </div>
          </div>
          <button onClick={onAddSong} style={{
            padding: "10px 18px", borderRadius: 4,
            background: "#1DB954", color: "#0E0B08",
            border: "none", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <window.SpotifyGlyph size={14}/> Add a song
          </button>
        </div>

        {/* Songs list */}
        <div style={{ padding: "20px 28px 28px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 14,
          }}>
            <h3 style={{
              fontFamily: "'Bricolage Grotesque', serif", fontWeight: 600,
              fontSize: 18, color: "#F4EAD8", margin: 0, letterSpacing: "-0.01em",
            }}>Songs the group loves</h3>
            {songs.length > 0 && (
              <button onClick={() => onExport({ kind: "artist", artistId: artist.id })} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 999,
                background: "transparent", color: "#E8C77A",
                border: "1px solid rgba(232, 199, 122, 0.4)",
                fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}>Export playlist →</button>
            )}
          </div>

          {songs.length === 0 ? (
            <div style={{
              padding: "32px 24px", textAlign: "center",
              border: "1px dashed rgba(255,255,255,0.1)",
              color: "rgba(244, 234, 216, 0.45)",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14,
            }}>
              Nobody's added a song yet.<br/>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                BE FIRST → tap "Add a song"
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...songs].sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0)).map(s => (
                <SongRow key={s.id} song={s} currentUser={currentUser}
                  onHeart={() => dispatch({ type: "toggleHeart", artistId: artist.id, songId: s.id, user: currentUser })}
                  onRemove={s.addedBy === currentUser ? () => dispatch({ type: "removeSong", artistId: artist.id, songId: s.id }) : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </window.Modal>
  );
}

function CollageHero({ tracks, fallback }) {
  if (tracks.length === 0) {
    // Big poster letterform of artist initials
    const initials = (fallback || "").split(/\s+/).slice(0, 2).map(w => w[0]).join("");
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, oklch(28% 0.06 60) 0%, oklch(18% 0.04 30) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 800,
          fontSize: 200, lineHeight: 1, color: "rgba(232, 199, 122, 0.18)",
          letterSpacing: "-0.05em",
        }}>{initials}</div>
      </div>
    );
  }
  const filled = [...tracks];
  while (filled.length < 4) filled.push(null);
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
    }}>
      {filled.slice(0, 4).map((t, i) => {
        if (!t) return <div key={`e-${i}`} style={{ background: "#1a140e" }}/>;
        const c = window.coverFor(t.id);
        return (
          <div key={t.id} style={{
            background: `linear-gradient(135deg, oklch(${c.lightness}% 0.18 ${c.hue1}) 0%, oklch(${c.lightness - 8}% 0.16 ${c.hue2}) 100%)`,
          }}/>
        );
      })}
    </div>
  );
}

function SongRow({ song, currentUser, onHeart, onRemove, showArtist = false }) {
  const hearts = song.hearts || [];
  const userHearted = hearts.includes(currentUser);
  const addedByFriend = window.FRIENDS.find(f => f.name === song.addedBy);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "44px 1fr auto auto",
      alignItems: "center", gap: 12,
      padding: "8px 10px", borderRadius: 4,
      transition: "background 0.1s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <window.AlbumArt track={song} size={44}/>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600,
          color: "#F4EAD8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{song.title}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "rgba(244, 234, 216, 0.45)", marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {showArtist && <span>{song.artist} · </span>}
          {song.album}
          {song.duration && <span> · {song.duration}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {song.addedBy && (
          <div title={`Added by ${song.addedBy}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <window.Avatar name={song.addedBy} size={18}/>
          </div>
        )}
        <window.HeartButton active={userHearted} count={hearts.length} onClick={onHeart}/>
      </div>
      {onRemove && (
        <button onClick={onRemove} title="Remove (you added this)" style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.3)",
          cursor: "pointer", padding: 4, fontSize: 14, lineHeight: 1,
        }}>×</button>
      )}
      {!onRemove && <div/>}
    </div>
  );
}

// — Add Song Modal ——————————————————————————————
function AddSongModal({ open, artist, onClose, onAdd, currentUser }) {
  const [query, setQuery] = useStateA("");
  const [results, setResults] = useStateA([]);
  const [searching, setSearching] = useStateA(false);
  const [searchError, setSearchError] = useStateA(null);
  const [pickedIds, setPickedIds] = useStateA(new Set());
  const inputRef = useRefA(null);

  async function spotifySearch(artistName, q) {
    const params = new URLSearchParams({ artist: artistName });
    if (q) params.set("q", q);
    const res = await fetch(`/api/music/search?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return (data.tracks || []).map(t => ({
      ...t,
      id: t.spotifyTrackId,
      artist: artistName,
      artistId: artist?.id,
    }));
  }

  useEffectA(() => {
    if (open) {
      setPickedIds(new Set());
      setQuery("");
      setSearchError(null);
      if (artist) {
        setSearching(true);
        spotifySearch(artist.artist, "")
          .then(tracks => { setResults(tracks); setSearchError(null); })
          .catch(err => { setResults([]); setSearchError(err.message); })
          .finally(() => setSearching(false));
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, artist]);

  // Debounced search on query change
  useEffectA(() => {
    if (!open) return;
    setSearching(true);
    setSearchError(null);
    const t = setTimeout(() => {
      spotifySearch(artist?.artist || "", query)
        .then(tracks => { setResults(tracks); setSearchError(null); })
        .catch(err => { setResults([]); setSearchError(err.message); })
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query, open, artist]);

  const togglePick = (id) => {
    setPickedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const picks = results.filter(r => pickedIds.has(r.id));
    onAdd(picks);
  };

  function fmtDuration(t) {
    if (t.duration) return t.duration;
    if (t.durationMs) {
      const s = Math.round(t.durationMs / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }
    return "";
  }

  return (
    <window.Modal open={open} onClose={onClose} maxWidth={620}>
      <div style={{
        padding: "22px 24px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <window.SpotifyGlyph size={18}/>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em",
          }}>SEARCH SPOTIFY CATALOG</span>
        </div>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
          fontSize: 26, lineHeight: 1.05, color: "#F4EAD8", margin: 0,
          letterSpacing: "-0.015em",
        }}>
          Add a song {artist && <>for <span style={{ color: "#E8C77A" }}>{artist.artist}</span></>}
        </h2>
        <p style={{ marginTop: 6, color: "rgba(244, 234, 216, 0.5)", fontSize: 13 }}>
          Tap to pick. Songs you add show up for everyone in the group.
        </p>

        <div style={{ position: "relative", marginTop: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={artist ? `Search ${artist.artist} songs…` : "Search by song or album…"}
            style={{
              width: "100%", padding: "12px 14px 12px 40px",
              background: "#0E0B08", color: "#F4EAD8",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, maxHeight: 360, padding: "8px 12px" }}>
        {searching ? (
          <div style={{ padding: 32, textAlign: "center", color: "rgba(244,234,216,0.4)", fontSize: 13 }}>
            Searching Spotify…
          </div>
        ) : searchError ? (
          <div style={{ padding: 24, margin: 12, borderRadius: 4, background: "rgba(232,85,63,0.08)", border: "1px solid rgba(232,85,63,0.3)" }}>
            <div style={{ color: "#E8553F", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>
              SPOTIFY ERROR
            </div>
            <div style={{ color: "rgba(244,234,216,0.8)", fontSize: 13 }}>{searchError}</div>
            {searchError.includes("not configured") && (
              <div style={{ marginTop: 10, color: "rgba(244,234,216,0.5)", fontSize: 12 }}>
                Add <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>SPOTIFY_CLIENT_ID</code> and <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>SPOTIFY_CLIENT_SECRET</code> to your Railway environment variables.
              </div>
            )}
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "rgba(244,234,216,0.4)", fontSize: 13 }}>
            No tracks found. Try a different search.
          </div>
        ) : (
          results.map(t => (
            <button key={t.id} onClick={() => togglePick(t.id)} style={{
              width: "100%", display: "grid",
              gridTemplateColumns: "44px 1fr auto 24px", alignItems: "center", gap: 12,
              padding: "8px 12px", borderRadius: 4,
              background: pickedIds.has(t.id) ? "rgba(29, 185, 84, 0.1)" : "transparent",
              border: pickedIds.has(t.id) ? "1px solid rgba(29, 185, 84, 0.5)" : "1px solid transparent",
              cursor: "pointer", textAlign: "left", marginBottom: 2,
            }}>
              <window.AlbumArt track={t} size={44}/>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600,
                  color: "#F4EAD8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{t.title}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "rgba(244, 234, 216, 0.45)", marginTop: 2,
                }}>{t.artist} · {t.album}</div>
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "rgba(244, 234, 216, 0.4)",
              }}>{fmtDuration(t)}</span>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: pickedIds.has(t.id) ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                background: pickedIds.has(t.id) ? "#1DB954" : "transparent",
                color: "#0E0B08", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14,
              }}>{pickedIds.has(t.id) ? "✓" : ""}</div>
            </button>
          ))
        )}
      </div>

      <div style={{
        padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "rgba(244, 234, 216, 0.5)",
        }}>
          {pickedIds.size} {pickedIds.size === 1 ? "track" : "tracks"} selected
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "10px 18px", borderRadius: 4,
            background: "transparent", color: "#F4EAD8",
            border: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleAdd} disabled={pickedIds.size === 0} style={{
            padding: "10px 18px", borderRadius: 4,
            background: pickedIds.size === 0 ? "rgba(29, 185, 84, 0.3)" : "#1DB954",
            color: "#0E0B08", border: "none",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: pickedIds.size === 0 ? "not-allowed" : "pointer",
          }}>Add {pickedIds.size > 0 && `(${pickedIds.size})`}</button>
        </div>
      </div>
    </window.Modal>
  );
}

Object.assign(window, { ArtistDetailModal, AddSongModal, SongRow });
