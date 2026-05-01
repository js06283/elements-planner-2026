// Main app — top-level state, navigation, profile picker, and view orchestration.

const { useState: useStateApp, useReducer, useEffect: useEffectApp } = React;

// ---- State reducer ---------------------------------------------------------
function appReducer(state, action) {
  switch (action.type) {
    case "setUser":
      return { ...state, currentUser: action.user };
    case "toggleFan": {
      const fans = state.fans[action.artistId] || [];
      const next = fans.includes(action.user)
        ? fans.filter(n => n !== action.user)
        : [...fans, action.user];
      return { ...state, fans: { ...state.fans, [action.artistId]: next } };
    }
    case "addSongs": {
      const existing = state.songsByArtist[action.artistId] || [];
      const merged = [...existing];
      const now = Date.now();
      for (const t of action.songs) {
        if (!merged.find(m => m.id === t.id)) {
          merged.push({
            ...t,
            addedBy: action.user,
            addedAt: now,
            hearts: [action.user],
          });
        }
      }
      return { ...state, songsByArtist: { ...state.songsByArtist, [action.artistId]: merged } };
    }
    case "removeSong": {
      const existing = state.songsByArtist[action.artistId] || [];
      return {
        ...state,
        songsByArtist: {
          ...state.songsByArtist,
          [action.artistId]: existing.filter(s => s.id !== action.songId),
        },
      };
    }
    case "toggleHeart": {
      const existing = state.songsByArtist[action.artistId] || [];
      return {
        ...state,
        songsByArtist: {
          ...state.songsByArtist,
          [action.artistId]: existing.map(s => {
            if (s.id !== action.songId) return s;
            const hearts = s.hearts || [];
            return {
              ...s,
              hearts: hearts.includes(action.user) ? hearts.filter(h => h !== action.user) : [...hearts, action.user],
            };
          }),
        },
      };
    }
    case "loadFromStorage":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ---- Seed (so the prototype feels alive on first load) ---------------------
function seedState() {
  // Pre-populate fans + songs across the lineup.
  const fans = {};
  const songsByArtist = {};

  const seedFans = {
    "PORTER ROBINSON":  ["Jess", "Theo", "Andy", "Noel", "Ellen", "PJ"],
    "SUBTRONICS":       ["Kevin", "Andy", "Theo"],
    "EXCISION":         ["Kevin", "Andy"],
    "CHARLOTTE DE WITTE": ["Jess", "Ellen", "Cindy"],
    "CHRIS LAKE":       ["Jess", "PJ", "Theo"],
    "ABOVE & BEYOND":   ["Ellen", "Noel", "Cindy"],
    "CLOZEE":           ["Noel", "PJ", "Jess"],
    "RAY VOLPE":        ["Kevin"],
    "LOUIS THE CHILD":  ["Theo", "Jess", "Andy"],
    "KETTAMA":          ["PJ"],
    "I HATE MODELS":    ["Cindy", "Ellen"],
    "GANJA WHITE NIGHT": ["Andy", "Kevin"],
    "ACRAZE":           ["PJ"],
    "IVY LAB":          ["Noel"],
  };
  for (const a of window.ARTISTS) {
    if (seedFans[a.artist]) fans[a.id] = seedFans[a.artist];
  }

  // Seed songs: top tracks already added by various people
  const seedSongs = [
    { artist: "PORTER ROBINSON", trackIds: ["pr-r4", "pr-r3", "pr-r5"], by: ["Jess", "Theo", "Noel"] },
    { artist: "PORTER ROBINSON", trackIds: ["pr-r1"], by: ["Andy"] },
    { artist: "SUBTRONICS",      trackIds: ["sb-2", "sb-1"], by: ["Kevin", "Andy"] },
    { artist: "EXCISION",        trackIds: ["ex-ahn", "ex-rob"], by: ["Kevin", "Kevin"] },
    { artist: "CHARLOTTE DE WITTE", trackIds: ["cdw-1", "cdw-2"], by: ["Jess", "Ellen"] },
    { artist: "CHRIS LAKE",      trackIds: ["cl-tut", "cl-ofu"], by: ["Jess", "PJ"] },
    { artist: "ABOVE & BEYOND",  trackIds: ["ab-sun", "ab-thg"], by: ["Ellen", "Noel"] },
    { artist: "CLOZEE",          trackIds: ["cz-1", "cz-2"], by: ["Noel", "PJ"] },
    { artist: "LOUIS THE CHILD", trackIds: ["lc-1", "lc-2"], by: ["Theo", "Jess"] },
    { artist: "ACRAZE",          trackIds: ["ac-1"], by: ["PJ"] },
    { artist: "RAY VOLPE",       trackIds: ["rv-1", "rv-3"], by: ["Kevin", "Andy"] },
    { artist: "IVY LAB",         trackIds: ["iv-1"], by: ["Noel"] },
    { artist: "KETTAMA",         trackIds: ["kt-1"], by: ["PJ"] },
    { artist: "I HATE MODELS",   trackIds: ["ihm-1"], by: ["Cindy"] },
    { artist: "GANJA WHITE NIGHT", trackIds: ["gwn-1"], by: ["Kevin"] },
  ];

  let now = Date.now();
  for (const seed of seedSongs) {
    const a = window.ARTISTS.find(x => x.artist === seed.artist);
    if (!a) continue;
    const arr = songsByArtist[a.id] || [];
    seed.trackIds.forEach((tid, i) => {
      const track = (window.TRACK_CATALOG[seed.artist] || []).find(t => t.id === tid);
      if (!track) return;
      const addedBy = seed.by[i] || seed.by[0];
      // Random hearts: addedBy + 0-3 random friends
      const friends = window.FRIENDS.map(f => f.name).filter(n => n !== addedBy);
      const heartCount = Math.floor(Math.random() * 4);
      const hearts = [addedBy, ...friends.sort(() => 0.5 - Math.random()).slice(0, heartCount)];
      arr.push({
        ...track,
        addedBy,
        addedAt: now -= 1000 * 60 * (5 + Math.random() * 60),
        hearts,
      });
    });
    songsByArtist[a.id] = arr;
  }

  return { fans, songsByArtist, currentUser: "Jess" };
}

const STORAGE_KEY = "elements26-songsfans-v1";

// ---- Tweakable defaults -----------------------------------------------------
const TWEAKS = /*EDITMODE-BEGIN*/{
  "accentColor": "#E8C77A",
  "cardDensity": "comfortable",
  "showSeed": true
}/*EDITMODE-END*/;

// ---- App --------------------------------------------------------------------
function App() {
  const [state, dispatch] = useReducer(appReducer, null, () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...seedState(), ...JSON.parse(stored) };
    } catch {}
    return seedState();
  });
  const [tab, setTab] = useStateApp("discovery"); // discovery | songs | schedule
  const [activeArtist, setActiveArtist] = useStateApp(null);
  const [addSongFor, setAddSongFor] = useStateApp(null);
  const [exportRequest, setExportRequest] = useStateApp(null);
  const [toast, setToast] = useStateApp(null);
  const [profileOpen, setProfileOpen] = useStateApp(false);
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAKS) : [TWEAKS, () => {}];

  // Persist
  useEffectApp(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fans: state.fans,
        songsByArtist: state.songsByArtist,
        currentUser: state.currentUser,
      }));
    } catch {}
  }, [state]);

  const currentUser = state.currentUser;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0E0B08",
      color: "#F4EAD8",
      fontFamily: "'Inter Tight', sans-serif",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        opacity: 0.4, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.4'/></svg>\")",
      }}/>

      {/* Header */}
      <Header
        tab={tab}
        setTab={setTab}
        currentUser={currentUser}
        onPickProfile={() => setProfileOpen(true)}
        onExportAll={() => setExportRequest({ kind: "all" })}
      />

      {/* Body */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto", padding: "24px 28px 80px" }}>
        {tab === "discovery" && (
          <window.DiscoveryView
            state={state}
            dispatch={dispatch}
            currentUser={currentUser}
            onArtistClick={a => setActiveArtist(a)}
            onAddSong={a => { setActiveArtist(a); setAddSongFor(a); }}
          />
        )}
        {tab === "songs" && (
          <window.SongsView
            state={state}
            dispatch={dispatch}
            currentUser={currentUser}
            onExport={req => setExportRequest(req)}
          />
        )}
        {tab === "schedule" && (
          <window.ScheduleView
            state={state}
            dispatch={dispatch}
            currentUser={currentUser}
            onArtistClick={a => setActiveArtist(a)}
          />
        )}
      </div>

      {/* Footer mini-info */}
      <div style={{
        position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto",
        padding: "24px 28px 40px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.35)", letterSpacing: "0.1em",
      }}>
        <span>ELEMENTS · SOUNDS LIKE THE WOODS · 2026</span>
        <span>SET TIMES INFERRED · WILL LOCK ON ANNOUNCEMENT</span>
        <span>{Object.values(state.songsByArtist).flat().length} SONGS · {Object.values(state.fans).flat().length} FAN MARKS</span>
      </div>

      {/* Modals & sheets */}
      <window.ArtistDetailModal
        open={!!activeArtist && !addSongFor}
        artist={activeArtist}
        state={state}
        dispatch={dispatch}
        currentUser={currentUser}
        onClose={() => setActiveArtist(null)}
        onAddSong={() => setAddSongFor(activeArtist)}
        onExport={req => setExportRequest(req)}
      />

      <window.AddSongModal
        open={!!addSongFor}
        artist={addSongFor}
        currentUser={currentUser}
        onClose={() => setAddSongFor(null)}
        onAdd={(picks) => {
          if (!addSongFor || picks.length === 0) {
            setAddSongFor(null);
            return;
          }
          dispatch({ type: "addSongs", artistId: addSongFor.id, songs: picks, user: currentUser });
          setToast({
            message: `Added ${picks.length} ${picks.length === 1 ? "song" : "songs"} to ${addSongFor.artist}`,
            kind: "success",
          });
          setAddSongFor(null);
        }}
      />

      <window.ExportSheet
        open={!!exportRequest}
        onClose={() => setExportRequest(null)}
        request={exportRequest}
        state={state}
        onToast={(t) => setToast(t)}
      />

      <ProfileModal
        open={profileOpen}
        currentUser={currentUser}
        onPick={(name) => { dispatch({ type: "setUser", user: name }); setProfileOpen(false); }}
        onClose={() => setProfileOpen(false)}
      />

      <window.Toast message={toast?.message} kind={toast?.kind} onClose={() => setToast(null)}/>
    </div>
  );
}

// ---- Header -----------------------------------------------------------------
function Header({ tab, setTab, currentUser, onPickProfile, onExportAll }) {
  const tabs = [
    { id: "discovery", label: "Discovery" },
    { id: "songs",     label: "Songs" },
    { id: "schedule",  label: "Schedule" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(14, 11, 8, 0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto",
        padding: "18px 28px",
        display: "flex", alignItems: "center", gap: 28,
      }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Bricolage Grotesque', serif", fontWeight: 800,
            fontSize: 22, color: "#F4EAD8", letterSpacing: "-0.025em",
            lineHeight: 1,
          }}>ELEMENTS</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "#E8C77A", letterSpacing: "0.18em", lineHeight: 1,
          }}>'26</span>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 14px", borderRadius: 4, border: "none",
              background: tab === t.id ? "rgba(244, 234, 216, 0.08)" : "transparent",
              color: tab === t.id ? "#F4EAD8" : "rgba(244, 234, 216, 0.55)",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.01em",
              borderBottom: tab === t.id ? "1px solid #E8C77A" : "1px solid transparent",
              borderRadius: 0,
            }}>{t.label}</button>
          ))}
        </nav>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onExportAll} style={{
            padding: "8px 14px", borderRadius: 4,
            background: "transparent", color: "#F4EAD8",
            border: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <window.SpotifyGlyph size={12}/>
            <window.AppleMusicGlyph size={12}/>
            Export
          </button>
          <button onClick={onPickProfile} style={{
            padding: "5px 14px 5px 6px", borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#F4EAD8", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
          }}>
            <window.Avatar name={currentUser} size={26}/>
            {currentUser}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ opacity: 0.5 }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ---- Profile Modal ----------------------------------------------------------
function ProfileModal({ open, currentUser, onPick, onClose }) {
  return (
    <window.Modal open={open} onClose={onClose} maxWidth={460}>
      <div style={{ padding: "24px 24px 8px" }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "rgba(244, 234, 216, 0.45)", letterSpacing: "0.14em", marginBottom: 8,
        }}>WHO ARE YOU?</div>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
          fontSize: 22, color: "#F4EAD8", margin: 0, letterSpacing: "-0.015em",
        }}>Pick your name</h2>
        <p style={{ marginTop: 6, color: "rgba(244, 234, 216, 0.5)", fontSize: 13 }}>
          Your fans + songs are tied to this name across every tab.
        </p>
      </div>
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {window.FRIENDS.map(f => (
          <button key={f.name} onClick={() => onPick(f.name)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 4,
            background: currentUser === f.name ? "rgba(232, 199, 122, 0.12)" : "rgba(255,255,255,0.03)",
            color: "#F4EAD8",
            border: `1px solid ${currentUser === f.name ? "rgba(232, 199, 122, 0.5)" : "rgba(255,255,255,0.06)"}`,
            cursor: "pointer", textAlign: "left",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600,
          }}>
            <window.Avatar name={f.name} size={28}/>
            {f.name}
            {currentUser === f.name && (
              <span style={{
                marginLeft: "auto",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: "#E8C77A", letterSpacing: "0.1em",
              }}>YOU</span>
            )}
          </button>
        ))}
      </div>
    </window.Modal>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
