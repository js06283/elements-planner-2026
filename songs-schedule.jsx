// Songs view — flat list of every song the group has added, with filters.
// Schedule view — fan-driven highlights on a stage timeline.

const { useState: useStateS, useMemo: useMemoS } = React;

function SongsView({ state, dispatch, currentUser, onExport }) {
  const [filterPerson, setFilterPerson] = useStateS("All");
  const [filterGenre,  setFilterGenre]  = useStateS("All");
  const [sort,         setSort]         = useStateS("recent");

  // Flatten
  const allSongs = useMemoS(() => {
    const out = [];
    for (const [artistId, songs] of Object.entries(state.songsByArtist)) {
      const artist = window.ARTISTS.find(a => a.id === artistId);
      if (!artist) continue;
      for (const s of songs) {
        out.push({ ...s, artist: artist.artist, artistId, genre: artist.genre, day: artist.day });
      }
    }
    return out;
  }, [state.songsByArtist]);

  const filtered = useMemoS(() => {
    let out = allSongs;
    if (filterPerson !== "All") out = out.filter(s => s.addedBy === filterPerson);
    if (filterGenre !== "All")  out = out.filter(s => s.genre === filterGenre);
    if (sort === "hearts")       out = [...out].sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0));
    else if (sort === "recent")  out = [...out].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    else if (sort === "artist")  out = [...out].sort((a, b) => a.artist.localeCompare(b.artist));
    return out;
  }, [allSongs, filterPerson, filterGenre, sort]);

  const genres = useMemoS(() => {
    const set = new Set(allSongs.map(s => s.genre));
    return ["All", ...Array.from(set).sort()];
  }, [allSongs]);

  const people = ["All", ...window.FRIENDS.map(f => f.name)];

  return (
    <div>
      {/* Header strip */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
        padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 20,
      }}>
        <FilterDD label="By" value={filterPerson} onChange={setFilterPerson} options={people}/>
        <FilterDD label="Genre" value={filterGenre} onChange={setFilterGenre} options={genres}/>
        <FilterDD label="Sort" value={sort} onChange={setSort} options={[
          { v: "recent", l: "Most Recent" },
          { v: "hearts", l: "Most Hearts" },
          { v: "artist", l: "Artist A→Z" },
        ]}/>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => onExport({ kind: "all" })} style={{
            padding: "10px 16px", borderRadius: 4,
            background: "#E8C77A", color: "#0E0B08",
            border: "none", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 700,
            letterSpacing: "0.02em",
          }}>Export this list →</button>
        </div>
      </div>

      {/* Quick chips for export shortcuts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em",
          alignSelf: "center", marginRight: 4,
        }}>QUICK EXPORT</span>
        {window.FRIENDS.slice(0, 4).map(f => (
          <button key={f.name} onClick={() => onExport({ kind: "person", person: f.name })} style={{
            padding: "6px 12px 6px 8px", borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            color: "#F4EAD8",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
            cursor: "pointer",
          }}>
            <window.Avatar name={f.name} size={18}/>
            {f.name}'s picks
          </button>
        ))}
        {["Dubstep", "Tech House", "Techno"].map(g => (
          <button key={g} onClick={() => onExport({ kind: "genre", genre: g })} style={{
            padding: "6px 12px", borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            color: "#F4EAD8",
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            letterSpacing: "0.04em", cursor: "pointer",
          }}>
            {g.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Songs table */}
      {filtered.length === 0 ? (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          border: "1px dashed rgba(255,255,255,0.1)",
          color: "rgba(244, 234, 216, 0.45)",
        }}>
          No songs match. Try clearing filters, or head to Discovery to add some.
        </div>
      ) : (
        <div style={{
          background: "#15110D", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {filtered.map(s => (
            <window.SongRow key={`${s.artistId}-${s.id}`} song={s} currentUser={currentUser}
              showArtist
              onHeart={() => dispatch({ type: "toggleHeart", artistId: s.artistId, songId: s.id, user: currentUser })}
              onRemove={s.addedBy === currentUser ? () => dispatch({ type: "removeSong", artistId: s.artistId, songId: s.id }) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDD({ label, value, onChange, options }) {
  const opts = options.map(o => typeof o === "string" ? { v: o, l: o } : o);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em",
      }}>{label.toUpperCase()}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: "rgba(255,255,255,0.04)", color: "#F4EAD8",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4,
        padding: "7px 28px 7px 12px", fontFamily: "'Inter Tight', sans-serif",
        fontSize: 12, fontWeight: 600, cursor: "pointer", appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F4EAD8' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
      }}>
        {opts.map(o => <option key={o.v} value={o.v} style={{ background: "#15110D" }}>{o.l}</option>)}
      </select>
    </div>
  );
}

// =================================================================
// Schedule view
// =================================================================

function ScheduleView({ state, dispatch, currentUser, onArtistClick }) {
  const [day, setDay] = useStateS("Friday");
  const [filter, setFilter] = useStateS("all"); // all | mine | group

  // Group artists by stage for the chosen day. "Interest" = fan heart,
  // must-see star, or curious mark — all three count for the filters.
  const filteredArtists = useMemoS(() => {
    return window.ARTISTS.filter(a => {
      if (a.day !== day) return false;
      const fans = state.fans[a.id] || [];
      const mustSee = (state.mustSeeByArtist || {})[a.id] || [];
      const curious = (state.curiousByArtist || {})[a.id] || [];
      if (filter === "mine")  return fans.includes(currentUser) || mustSee.includes(currentUser) || curious.includes(currentUser);
      if (filter === "group") return fans.length + mustSee.length + curious.length > 0;
      return true;
    });
  }, [day, filter, state.fans, state.mustSeeByArtist, state.curiousByArtist, currentUser]);

  // For timeline grid: gather time range
  const stages = ["water", "air", "earth", "fire"];
  const allTimes = window.ARTISTS.filter(a => a.day === day).map(a => a.timeStart);
  const startMins = Math.min(...allTimes.map(t => toMin(t)));
  const endMins = Math.max(...window.ARTISTS.filter(a => a.day === day).map(a => toMin(a.timeEnd)));
  const totalMins = endMins - startMins;
  const hourPx = 90;

  return (
    <div>
      <div style={{
        padding: "20px 0", display: "flex", flexWrap: "wrap", gap: 16,
        alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 24,
      }}>
        <FilterDD label="Day" value={day} onChange={setDay} options={["Friday", "Saturday", "Sunday"]}/>
        <FilterDD label="Show" value={filter} onChange={setFilter} options={[
          { v: "all", l: "All sets" },
          { v: "mine", l: "My picks" },
          { v: "group", l: "Group picks" },
        ]}/>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em",
          }}>SET TIMES</span>
          <span style={{
            padding: "3px 8px", background: "rgba(127, 176, 105, 0.12)",
            color: "#7FB069",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.1em",
            border: "1px solid rgba(127, 176, 105, 0.3)",
          }}>OFFICIAL</span>
          <span style={{ fontSize: 12, color: "rgba(244, 234, 216, 0.5)" }}>
            Final times from the festival's release.
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: "rgba(244, 234, 216, 0.5)",
      }}>
        <span>HEART = YOU'RE A FAN</span>
        <span style={{ color: "rgba(232, 199, 122, 0.7)" }}>★ = MUST SEE</span>
        <span style={{ color: "rgba(63, 184, 176, 0.8)" }}>? = CURIOUS</span>
        <span style={{ color: "rgba(232, 199, 122, 0.7)" }}>GLOW = GROUP PICK</span>
        <span>OPACITY = NO INTEREST YET</span>
      </div>

      {/* Timeline grid */}
      <div style={{
        background: "#15110D", border: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "60px repeat(4, minmax(180px, 1fr))",
          minWidth: 800,
        }}>
          {/* Header row */}
          <div style={{
            padding: 12, borderRight: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(0,0,0,0.2)",
          }}/>
          {stages.map(s => {
            const tint = window.STAGE_TINTS[s];
            return (
              <div key={s} style={{
                padding: 12, borderRight: "1px solid rgba(255,255,255,0.05)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: tint.fg }}/>
                <span style={{
                  fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
                  fontSize: 16, color: tint.fg, letterSpacing: "-0.01em",
                }}>{tint.label}</span>
              </div>
            );
          })}

          {/* Time axis + columns */}
          <div style={{ position: "relative", height: (totalMins / 60) * hourPx, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            {Array.from({ length: Math.ceil(totalMins / 60) + 1 }).map((_, i) => {
              const m = startMins + i * 60;
              return (
                <div key={i} style={{
                  position: "absolute", top: i * hourPx, right: 8,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "rgba(244, 234, 216, 0.45)",
                  transform: "translateY(-50%)",
                }}>{window.fmtClock(minToHHMM(m))}</div>
              );
            })}
          </div>
          {stages.map(s => (
            <div key={s} style={{
              position: "relative",
              height: (totalMins / 60) * hourPx,
              borderRight: "1px solid rgba(255,255,255,0.05)",
              background: "repeating-linear-gradient(to bottom, transparent 0 " + (hourPx - 1) + "px, rgba(255,255,255,0.04) " + (hourPx - 1) + "px " + hourPx + "px)",
            }}>
              {filteredArtists.filter(a => a.stage === s).map(a => {
                const fans = state.fans[a.id] || [];
                const mustSee = (state.mustSeeByArtist || {})[a.id] || [];
                const curious = (state.curiousByArtist || {})[a.id] || [];
                const songs = state.songsByArtist[a.id] || [];
                const isFan = fans.includes(currentUser);
                const isMustSee = mustSee.includes(currentUser);
                const isCurious = curious.includes(currentUser);
                const interested = [...mustSee, ...fans.filter(n => !mustSee.includes(n)), ...curious.filter(n => !mustSee.includes(n) && !fans.includes(n))];
                const groupPick = new Set([...fans, ...mustSee]).size >= 2;
                const top = ((toMin(a.timeStart) - startMins) / 60) * hourPx;
                const height = ((toMin(a.timeEnd) - toMin(a.timeStart)) / 60) * hourPx - 2;
                const tint = window.STAGE_TINTS[s];
                // Personal accent: must-see (gold) > fan (stage tint) > curious (teal).
                const accent = isMustSee ? "#E8C77A" : isFan ? tint.fg : isCurious ? "#3FB8B0" : null;

                return (
                  <button key={a.id} onClick={() => onArtistClick(a)} style={{
                    position: "absolute", left: 6, right: 6,
                    top, height,
                    background: accent ? `${accent}14` : (interested.length === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)"),
                    border: `1px solid ${accent || (groupPick ? "rgba(232, 199, 122, 0.5)" : "rgba(255,255,255,0.08)")}`,
                    borderLeft: `3px solid ${tint.fg}`,
                    boxShadow: groupPick ? "0 0 0 1px rgba(232, 199, 122, 0.25), 0 0 18px rgba(232, 199, 122, 0.15)" : "none",
                    padding: "6px 8px", textAlign: "left",
                    cursor: "pointer", overflow: "hidden",
                    opacity: filter === "all" && interested.length === 0 ? 0.55 : 1,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4, marginBottom: 2,
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: "rgba(244, 234, 216, 0.55)", letterSpacing: "0.06em",
                    }}>
                      <span>{window.fmtClock(a.timeStart)}</span>
                      {isMustSee && <span style={{ color: "#E8C77A", fontSize: 10 }}>★</span>}
                      {isFan && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#E8553F">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      )}
                      {isCurious && <span style={{ color: "#3FB8B0", fontSize: 10, fontWeight: 700 }}>?</span>}
                      <span style={{ marginLeft: "auto", display: "inline-flex", gap: 5 }}>
                        {mustSee.length > 0 && <span style={{ color: "#E8C77A" }}>★{mustSee.length}</span>}
                        {curious.length > 0 && <span style={{ color: "#3FB8B0" }}>?{curious.length}</span>}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
                      fontSize: 13, lineHeight: 1.05, color: "#F4EAD8",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{a.artist}</div>
                    {interested.length > 0 && height > 60 && (
                      <div style={{ marginTop: 6 }}>
                        <window.AvatarStack names={interested} size={16} max={4}/>
                      </div>
                    )}
                    {songs.length > 0 && height > 90 && (
                      <div style={{
                        marginTop: 6,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        color: "rgba(244, 234, 216, 0.5)",
                      }}>♪ {songs.length} {songs.length === 1 ? "song" : "songs"}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minToHHMM(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

Object.assign(window, { SongsView, ScheduleView });
