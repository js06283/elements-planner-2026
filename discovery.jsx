// Discovery — primary artist browse view.
// Rich cards with 2x2 album-art collage, fan heart-stack, top songs.

const { useState: useStateD, useMemo: useMemoD } = React;

function DiscoveryView({ state, dispatch, onArtistClick, onAddSong, currentUser }) {
  const [day, setDay] = useStateD("All");
  const [stage, setStage] = useStateD("All");
  const [genre, setGenre] = useStateD("All");
  const [sort, setSort] = useStateD("fans"); // lineup | fans | songs

  const days = ["All", "Friday", "Saturday", "Sunday"];
  const genres = useMemoD(() => {
    const set = new Set(window.ARTISTS.map(a => a.genre));
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemoD(() => {
    let out = window.ARTISTS.filter(a => {
      if (day !== "All" && a.day !== day) return false;
      if (stage !== "All" && a.stage !== stage) return false;
      if (genre !== "All" && a.genre !== genre) return false;
      return true;
    });
    if (sort === "fans") {
      const score = id => (state.fans[id]?.length || 0) + (state.mustSeeByArtist[id]?.length || 0) * 2 + (state.curiousByArtist[id]?.length || 0) * 0.5;
      out = [...out].sort((a, b) => score(b.id) - score(a.id));
    } else if (sort === "songs") {
      out = [...out].sort((a, b) => (state.songsByArtist[b.id]?.length || 0) - (state.songsByArtist[a.id]?.length || 0));
    }
    return out;
  }, [day, stage, genre, sort, state]);

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 16,
        padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 28,
      }}>
        <FilterPills label="Day" value={day} onChange={setDay} options={days}/>
        <StagePills value={stage} onChange={setStage}/>
        <FilterDropdown label="Genre" value={genre} onChange={setGenre} options={genres}/>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.14em",
          }}>SORT</span>
          <FilterPills value={sort} onChange={setSort} options={[
            { v: "lineup", l: "Lineup" },
            { v: "fans",   l: "Most Fans" },
            { v: "songs",  l: "Most Songs" },
          ]}/>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 1, marginBottom: 28, background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Stat label="Artists" value={filtered.length}/>
        <Stat label="Songs Added" value={Object.values(state.songsByArtist).flat().length}/>
        <Stat label="Your Faves" value={Object.entries(state.fans).filter(([,v]) => v.includes(currentUser)).length}/>
        <Stat label="Friends Active" value={new Set(Object.values(state.fans).flat()).size}/>
      </div>

      {/* Artist grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 24,
      }}>
        {filtered.map(a => (
          <ArtistCard
            key={a.id}
            artist={a}
            fans={state.fans[a.id] || []}
            mustSee={(state.mustSeeByArtist || {})[a.id] || []}
            curious={(state.curiousByArtist || {})[a.id] || []}
            songs={state.songsByArtist[a.id] || []}
            comments={(state.commentsByArtist || {})[a.id] || []}
            currentUser={currentUser}
            onToggleFan={() => dispatch({ type: "toggleFan", artistId: a.id, user: currentUser })}
            onToggleMustSee={() => dispatch({ type: "toggleMustSee", artistId: a.id, user: currentUser })}
            onToggleCurious={() => dispatch({ type: "toggleCurious", artistId: a.id, user: currentUser })}
            onClick={() => onArtistClick(a)}
            onAddSong={() => onAddSong(a)}
          />
        ))}
      </div>
    </div>
  );
}

// — Filter pills ————————————————————————
function FilterPills({ label, value, onChange, options }) {
  const opts = options.map(o => typeof o === "string" ? { v: o, l: o } : o);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {label && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.14em",
        }}>{label.toUpperCase()}</span>
      )}
      <div style={{
        display: "inline-flex", padding: 3, gap: 2,
        background: "rgba(255,255,255,0.04)", borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            padding: "6px 14px", borderRadius: 999, border: "none",
            background: value === o.v ? "#F4EAD8" : "transparent",
            color: value === o.v ? "#0E0B08" : "rgba(244, 234, 216, 0.65)",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function StagePills({ value, onChange }) {
  const stages = [
    { v: "All",   l: "All Stages" },
    { v: "fire",  l: "🔥 Fire" },
    { v: "earth", l: "🌍 Earth" },
    { v: "water", l: "💧 Water" },
    { v: "air",   l: "💨 Air" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.14em",
      }}>STAGE</span>
      <div style={{
        display: "inline-flex", padding: 3, gap: 2,
        background: "rgba(255,255,255,0.04)", borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {stages.map(s => {
          const tint = s.v !== "All" ? window.STAGE_TINTS[s.v] : null;
          const active = value === s.v;
          return (
            <button key={s.v} onClick={() => onChange(s.v)} style={{
              padding: "6px 14px", borderRadius: 999, border: "none",
              background: active ? (tint ? tint.bg : "#F4EAD8") : "transparent",
              color: active ? (tint ? tint.fg : "#0E0B08") : "rgba(244, 234, 216, 0.65)",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: active && tint ? `inset 0 0 0 1px ${tint.fg}40` : "none",
            }}>{s.l}</button>
          );
        })}
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.14em",
      }}>{label.toUpperCase()}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: "rgba(255,255,255,0.04)", color: "#F4EAD8",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999,
        padding: "7px 32px 7px 14px", fontFamily: "'Inter Tight', sans-serif",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F4EAD8' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      }}>
        {options.map(o => <option key={o} value={o} style={{ background: "#15110D" }}>{o}</option>)}
      </select>
    </div>
  );
}

// — Stat box ————————————————————————
function Stat({ label, value }) {
  return (
    <div style={{ background: "#15110D", padding: "16px 18px" }}>
      <div style={{
        fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
        fontSize: 32, lineHeight: 1, color: "#F4EAD8", letterSpacing: "-0.02em",
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em", marginTop: 6,
      }}>{label.toUpperCase()}</div>
    </div>
  );
}

// — Artist card ————————————————————————
function ArtistCard({ artist, fans, mustSee, curious, songs, comments, currentUser, onToggleFan, onToggleMustSee, onToggleCurious, onClick, onAddSong }) {
  const isFan = fans.includes(currentUser);
  const isMustSee = mustSee.includes(currentUser);
  const isCurious = curious.includes(currentUser);
  const tint = window.STAGE_TINTS[artist.stage];
  // Top 4 songs by hearts (fall back to first 4 added)
  const topSongs = [...songs].sort((a, b) => (b.hearts?.length || 0) - (a.hearts?.length || 0)).slice(0, 4);

  return (
    <div onClick={onClick} style={{
      background: "#15110D",
      border: "1px solid rgba(255,255,255,0.06)",
      cursor: "pointer", overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: "border-color 0.15s, transform 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232, 199, 122, 0.4)"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
    >
      {/* Album collage area — full bleed */}
      <div style={{ position: "relative", aspectRatio: "1.4 / 1", overflow: "hidden" }}>
        <CollageBackground tracks={topSongs}/>

        {/* Day chip top-left */}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span style={{
            display: "inline-block", padding: "4px 10px",
            background: "rgba(14, 11, 8, 0.85)", color: "#F4EAD8",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            fontWeight: 600, letterSpacing: "0.12em",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>{artist.day.toUpperCase()}</span>
        </div>

        {/* Reaction buttons top-right */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onToggleCurious} title="I'm curious" style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isCurious ? "#3FB8B0" : "rgba(14, 11, 8, 0.85)",
            color: isCurious ? "#0E0B08" : "#F4EAD8",
            border: `1px solid ${isCurious ? "#3FB8B0" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", fontSize: 15, fontWeight: 700,
          }}>?</button>
          <button onClick={onToggleMustSee} title="Must See" style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isMustSee ? "#E8C77A" : "rgba(14, 11, 8, 0.85)",
            color: isMustSee ? "#0E0B08" : "#F4EAD8",
            border: `1px solid ${isMustSee ? "#E8C77A" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", fontSize: 16,
          }}>★</button>
          <button onClick={onToggleFan} title="Fan" style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isFan ? "#E8553F" : "rgba(14, 11, 8, 0.85)",
            color: isFan ? "#0E0B08" : "#F4EAD8",
            border: `1px solid ${isFan ? "#E8553F" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFan ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Time + stage bottom-right */}
        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6 }}>
          <window.StageTag stage={artist.stage}/>
        </div>

        {songs.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "rgba(244, 234, 216, 0.35)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            letterSpacing: "0.14em",
          }}>NO SONGS YET</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "18px 18px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(244, 234, 216, 0.4)", letterSpacing: "0.14em",
            marginBottom: 4,
          }}>
            <span>{artist.genre.toUpperCase()}</span>
            <span style={{ color: "rgba(244, 234, 216, 0.2)" }}>·</span>
            <span>{artist.timeStart}</span>
          </div>
          <h3 style={{
            fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
            fontSize: 24, lineHeight: 1.05, color: "#F4EAD8",
            margin: 0, letterSpacing: "-0.015em",
          }}>{artist.artist}</h3>
        </div>

        {/* Fans row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, paddingTop: 12, borderTop: "1px dashed rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {(fans.length + mustSee.length + curious.length) > 0 ? (
              <>
                <window.AvatarStack names={[...mustSee, ...fans.filter(n => !mustSee.includes(n)), ...curious.filter(n => !mustSee.includes(n) && !fans.includes(n))]} size={22} max={4}/>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "rgba(244, 234, 216, 0.55)",
                }}>
                  {mustSee.length > 0 && <span style={{ color: "#E8C77A" }}>★{mustSee.length} </span>}
                  {fans.length > 0 && <span>♥{fans.length} </span>}
                  {curious.length > 0 && <span style={{ color: "#3FB8B0" }}>?{curious.length}</span>}
                </span>
              </>
            ) : (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "rgba(244, 234, 216, 0.3)", letterSpacing: "0.06em",
              }}>BE THE FIRST FAN</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {comments.length > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "rgba(244, 234, 216, 0.45)",
              }}>✦ {comments.length}</span>
            )}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "rgba(244, 234, 216, 0.55)",
            }}>{songs.length > 0 ? `♪ ${songs.length}` : "+ song"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collage background for card hero. Uses 4 album-art tiles with parallax-y staggered layout.
function CollageBackground({ tracks }) {
  // Synthesize gradient tiles
  if (tracks.length === 0) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-linear-gradient(135deg, #1f1812 0 12px, #1a140e 12px 24px)",
      }}/>
    );
  }
  const filled = [...tracks];
  while (filled.length < 4) filled.push(null);
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr",
      gap: 1, background: "#0E0B08",
    }}>
      {filled.slice(0, 4).map((t, i) => {
        if (!t) {
          return <div key={`e-${i}`} style={{
            background: "repeating-linear-gradient(135deg, #1f1812 0 12px, #1a140e 12px 24px)",
          }}/>;
        }
        if (t.artworkUrl) {
          return (
            <img key={t.id} src={t.artworkUrl} alt={t.title || ""}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
          );
        }
        const c = window.coverFor(t.id);
        return (
          <div key={t.id} style={{
            position: "relative",
            background: `linear-gradient(135deg, oklch(${c.lightness}% 0.18 ${c.hue1}) 0%, oklch(${c.lightness - 8}% 0.16 ${c.hue2}) 100%)`,
          }}>
            <div style={{
              position: "absolute", left: 8, bottom: 6, right: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "rgba(255,255,255,0.85)", fontWeight: 600,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}>{t.title}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { DiscoveryView });
