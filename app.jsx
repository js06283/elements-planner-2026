// Main app — top-level state, navigation, profile picker, and view orchestration.

const { useState: useStateApp, useReducer, useEffect: useEffectApp, useRef: useRefApp } = React;

// ---- State reducer ---------------------------------------------------------
function appReducer(state, action) {
  switch (action.type) {
    case "setUser":
      return { ...state, currentUser: action.user };
    case "toggleFan": {
      const fans = state.fans[action.artistId] || [];
      const isFan = fans.includes(action.user);
      return {
        ...state,
        fans: { ...state.fans, [action.artistId]: isFan ? fans.filter(n => n !== action.user) : [...fans, action.user] },
        mustSeeByArtist: { ...state.mustSeeByArtist, [action.artistId]: (state.mustSeeByArtist[action.artistId] || []).filter(n => n !== action.user) },
        curiousByArtist: { ...state.curiousByArtist, [action.artistId]: (state.curiousByArtist[action.artistId] || []).filter(n => n !== action.user) },
      };
    }
    case "toggleMustSee": {
      const mustSee = state.mustSeeByArtist[action.artistId] || [];
      const isMustSee = mustSee.includes(action.user);
      return {
        ...state,
        mustSeeByArtist: { ...state.mustSeeByArtist, [action.artistId]: isMustSee ? mustSee.filter(n => n !== action.user) : [...mustSee, action.user] },
        fans: { ...state.fans, [action.artistId]: (state.fans[action.artistId] || []).filter(n => n !== action.user) },
        curiousByArtist: { ...state.curiousByArtist, [action.artistId]: (state.curiousByArtist[action.artistId] || []).filter(n => n !== action.user) },
      };
    }
    case "toggleCurious": {
      const curious = state.curiousByArtist[action.artistId] || [];
      const isCurious = curious.includes(action.user);
      return {
        ...state,
        curiousByArtist: { ...state.curiousByArtist, [action.artistId]: isCurious ? curious.filter(n => n !== action.user) : [...curious, action.user] },
        fans: { ...state.fans, [action.artistId]: (state.fans[action.artistId] || []).filter(n => n !== action.user) },
        mustSeeByArtist: { ...state.mustSeeByArtist, [action.artistId]: (state.mustSeeByArtist[action.artistId] || []).filter(n => n !== action.user) },
      };
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
    case "addComment": {
      const prev = state.commentsByArtist[action.artistId] || [];
      return {
        ...state,
        commentsByArtist: {
          ...state.commentsByArtist,
          [action.artistId]: [...prev, {
            id: `cm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: action.text,
            author: action.user,
            addedAt: Date.now(),
          }],
        },
      };
    }
    case "deleteComment": {
      const prev = state.commentsByArtist[action.artistId] || [];
      return {
        ...state,
        commentsByArtist: {
          ...state.commentsByArtist,
          [action.artistId]: prev.filter(c => c.id !== action.commentId),
        },
      };
    }
    case "setProfile": {
      const prev = state.profiles || {};
      return { ...state, profiles: { ...prev, [action.user]: { ...(prev[action.user] || {}), ...action.patch } } };
    }
    case "addExtraFriend": {
      const already = (state.extraFriends || []).find(f => f.name === action.friend.name);
      if (already) return state;
      return { ...state, extraFriends: [...(state.extraFriends || []), action.friend] };
    }
    case "setVibePosition": {
      const prev = state.vibePositions || {};
      if (action.pos === null) {
        const next = { ...prev };
        delete next[action.user];
        return { ...state, vibePositions: next };
      }
      return { ...state, vibePositions: { ...prev, [action.user]: action.pos } };
    }
    case "setArtistVibePosition": {
      const prev = state.artistVibePositions || {};
      return { ...state, artistVibePositions: { ...prev, [action.artistId]: action.pos } };
    }
    case "loadFromStorage": {
      const next = { ...state, ...action.payload };
      // Merge profiles per-user: server wins for users it knows about,
      // local wins for users the server has never seen (handles fresh deployments).
      if (action.payload.profiles !== undefined) {
        const local = state.profiles || {};
        const server = action.payload.profiles || {};
        const merged = { ...local };
        for (const user of Object.keys(server)) {
          merged[user] = server[user]; // server is authoritative per user once it has them
        }
        next.profiles = merged;
      }
      return next;
    }
    default:
      return state;
  }
}

// ---- Seed (so the prototype feels alive on first load) ---------------------
function seedState() {
  return { fans: {}, mustSeeByArtist: {}, curiousByArtist: {}, songsByArtist: {}, commentsByArtist: {}, vibePositions: {}, artistVibePositions: {}, extraFriends: [], profiles: {}, currentUser: "" };
}

const STORAGE_KEY = "elements26-songsfans-v2";

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
  const [toast, setToast] = useStateApp(null);
  const [profileOpen, setProfileOpen] = useStateApp(false);
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAKS) : [TWEAKS, () => {}];

  // Persist to localStorage
  useEffectApp(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fans: state.fans,
        mustSeeByArtist: state.mustSeeByArtist,
        curiousByArtist: state.curiousByArtist,
        songsByArtist: state.songsByArtist,
        commentsByArtist: state.commentsByArtist,
        vibePositions: state.vibePositions,
        artistVibePositions: state.artistVibePositions,
        extraFriends: state.extraFriends,
        profiles: state.profiles,
        currentUser: state.currentUser,
      }));
    } catch {}
  }, [state]);

  // --- Server sync (shared state across all browsers/devices) ---
  const lastSyncRef = useRefApp(0);

  function applyServerState(data) {
    if (!data) return;
    const hasData = Object.keys(data.fans || {}).length > 0
      || Object.keys(data.songsByArtist || {}).length > 0
      || Object.keys(data.commentsByArtist || {}).length > 0
      || Object.keys(data.mustSeeByArtist || {}).length > 0
      || Object.keys(data.curiousByArtist || {}).length > 0
      || Object.keys(data.vibePositions || {}).length > 0
      || Object.keys(data.profiles || {}).length > 0;
    if (!hasData) return;
    const payload = {
      fans: data.fans || {},
      mustSeeByArtist: data.mustSeeByArtist || {},
      curiousByArtist: data.curiousByArtist || {},
      songsByArtist: data.songsByArtist || {},
      commentsByArtist: data.commentsByArtist || {},
    };
    // Only overwrite these if the server actually has them — prevents wiping
    // local state when loading from a pre-feature server snapshot
    if (data.vibePositions !== undefined) payload.vibePositions = data.vibePositions;
    if (data.artistVibePositions !== undefined) payload.artistVibePositions = data.artistVibePositions;
    if (data.extraFriends !== undefined) payload.extraFriends = data.extraFriends;
    if (data.profiles !== undefined) payload.profiles = data.profiles;
    dispatch({ type: "loadFromStorage", payload });
  }

  // Load from server on mount (overrides localStorage with shared group state)
  useEffectApp(() => {
    fetch("/api/app-state")
      .then(r => r.json())
      .then(applyServerState)
      .catch(() => {});
  }, []);

  // Save to server debounced 800ms after any shared state change
  useEffectApp(() => {
    lastSyncRef.current = Date.now(); // mark dirty immediately so the poll backs off
    const timer = setTimeout(() => {
      lastSyncRef.current = Date.now();
      fetch("/api/app-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fans: state.fans,
          mustSeeByArtist: state.mustSeeByArtist,
          curiousByArtist: state.curiousByArtist,
          songsByArtist: state.songsByArtist,
          commentsByArtist: state.commentsByArtist,
          vibePositions: state.vibePositions,
          artistVibePositions: state.artistVibePositions,
          extraFriends: state.extraFriends,
          profiles: state.profiles,
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [state.fans, state.mustSeeByArtist, state.curiousByArtist, state.songsByArtist, state.commentsByArtist, state.vibePositions, state.artistVibePositions, state.extraFriends, state.profiles]);

  // Immediate save helper — call with any extra fields to merge before PUT
  function saveStateNow(extra = {}) {
    lastSyncRef.current = Date.now();
    fetch("/api/app-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fans: state.fans,
        mustSeeByArtist: state.mustSeeByArtist,
        curiousByArtist: state.curiousByArtist,
        songsByArtist: state.songsByArtist,
        commentsByArtist: state.commentsByArtist,
        vibePositions: state.vibePositions,
        artistVibePositions: state.artistVibePositions,
        extraFriends: state.extraFriends,
        profiles: state.profiles,
        ...extra,
      }),
    }).catch(() => {});
  }

  // Save profiles immediately to DB whenever they change (no debounce — photos/bio must not get lost)
  const profilesRef = useRefApp(state.profiles);
  useEffectApp(() => {
    if (state.profiles === profilesRef.current) return;
    profilesRef.current = state.profiles;
    if (!state.profiles || Object.keys(state.profiles).length === 0) return;
    lastSyncRef.current = Date.now();
    fetch("/api/app-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fans: state.fans,
        mustSeeByArtist: state.mustSeeByArtist,
        curiousByArtist: state.curiousByArtist,
        songsByArtist: state.songsByArtist,
        commentsByArtist: state.commentsByArtist,
        vibePositions: state.vibePositions,
        artistVibePositions: state.artistVibePositions,
        extraFriends: state.extraFriends,
        profiles: state.profiles,
      }),
    }).catch(() => {});
  }, [state.profiles]);

  // Force profile modal open until a user is chosen
  useEffectApp(() => {
    if (!currentUser) setProfileOpen(true);
  }, [currentUser]);

  // Keep window.FRIENDS in sync with dynamically added people
  useEffectApp(() => {
    for (const f of state.extraFriends || []) {
      if (!window.FRIENDS.find(x => x.name === f.name)) {
        window.FRIENDS.push(f);
      }
    }
  }, [state.extraFriends]);

  // Poll every 15s so changes from other devices appear without a refresh
  useEffectApp(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastSyncRef.current < 4000) return; // skip if we just saved
      fetch("/api/app-state")
        .then(r => r.json())
        .then(applyServerState)
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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
      />

      {/* Body */}
      <div className="app-main" style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto", padding: "24px 28px 80px" }}>
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
            onAddSong={a => { setActiveArtist(a); setAddSongFor(a); }}
          />
        )}
        {tab === "schedule" && (
          <window.ScheduleView
            state={state}
            dispatch={dispatch}
            currentUser={currentUser}
            onArtistClick={a => setActiveArtist(a)}
            onToast={message => setToast({ message, kind: "info" })}
          />
        )}
        {tab === "vibe" && (
          <window.VibeView
            state={state}
            dispatch={dispatch}
            currentUser={currentUser}
            onPickProfile={() => setProfileOpen(true)}
            onSaveVibePos={(pos) => saveStateNow({
              vibePositions: { ...state.vibePositions, [currentUser]: pos },
            })}
          />
        )}
      </div>

      {/* Footer mini-info */}
      <div className="app-footer" style={{
        position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto",
        padding: "24px 28px 40px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "rgba(244, 234, 216, 0.35)", letterSpacing: "0.1em",
      }}>
        <span>ELEMENTS · SOUNDS LIKE THE WOODS · 2026</span>
        <span>SET TIMES OFFICIAL · AUG 7–9 · LONG POND, PA</span>
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
        onSaveArtistVibePos={(artistId, pos) => saveStateNow({
          artistVibePositions: { ...state.artistVibePositions, [artistId]: pos },
        })}
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

      <ProfileModal
        open={profileOpen}
        currentUser={currentUser}
        required={!currentUser}
        extraFriends={state.extraFriends || []}
        onAddFriend={(f) => dispatch({ type: "addExtraFriend", friend: f })}
        onPick={(name) => { dispatch({ type: "setUser", user: name }); setProfileOpen(false); }}
        onClose={() => { if (currentUser) setProfileOpen(false); }}
      />

      <window.Toast message={toast?.message} kind={toast?.kind} onClose={() => setToast(null)}/>
    </div>
  );
}

// ---- Header -----------------------------------------------------------------
function Header({ tab, setTab, currentUser, onPickProfile }) {
  const tabs = [
    { id: "discovery", label: "Discovery" },
    { id: "songs",     label: "Songs" },
    { id: "schedule",  label: "Schedule" },
    { id: "vibe",      label: "Profiles" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(14, 11, 8, 0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="app-header-inner" style={{
        maxWidth: 1320, margin: "0 auto",
        padding: "18px 28px",
        display: "flex", alignItems: "center", gap: 28,
      }}>
        {/* Wordmark */}
        <div className="app-wordmark" style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
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
        <nav className="app-nav" style={{ display: "flex", gap: 4, flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} style={{
              padding: "8px 14px", border: "none",
              background: tab === t.id ? "rgba(244, 234, 216, 0.08)" : "transparent",
              color: t.disabled ? "rgba(244, 234, 216, 0.2)" : tab === t.id ? "#F4EAD8" : "rgba(244, 234, 216, 0.55)",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: t.disabled ? "default" : "pointer", letterSpacing: "0.01em",
              borderBottom: tab === t.id ? "1px solid #E8C77A" : "1px solid transparent",
              borderRadius: 0,
            }}>
              {t.label}
              {t.disabled && <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.6 }}>soon</span>}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="app-profile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onPickProfile} style={{
            padding: "5px 14px 5px 6px", borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#F4EAD8", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
          }}>
            <window.Avatar name={currentUser} size={26}/>
            <span className="app-profile-name">{currentUser}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="app-profile-chevron" style={{ opacity: 0.5 }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ---- Profile Modal ----------------------------------------------------------
function ProfileModal({ open, currentUser, required, extraFriends, onAddFriend, onPick, onClose }) {
  const [adding, setAdding] = useStateApp(false);
  const [newName, setNewName] = useStateApp("");

  function submitNew() {
    const name = newName.trim();
    if (!name) return;
    // Generate a color from name hash
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const PALETTE = ["#F06292","#AED581","#4FC3F7","#FFB74D","#CE93D8","#80DEEA","#F48FB1","#90CAF9","#A5D6A7","#FFCC80"];
    const color = PALETTE[h % PALETTE.length];
    onAddFriend({ name, color });
    onPick(name);
    setNewName("");
    setAdding(false);
  }

  const allFriends = [...window.FRIENDS, ...(extraFriends || []).filter(f => !window.FRIENDS.find(x => x.name === f.name))];

  return (
    <window.Modal open={open} onClose={() => { setAdding(false); setNewName(""); onClose(); }} maxWidth={460} required={required}>
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
          {required ? "Choose your name to get started." : "Your fans + songs are tied to this name across every tab."}
        </p>
      </div>
      <div className="profile-picker-grid" style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {allFriends.map(f => (
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

        {/* Add person row */}
        {adding ? (
          <div style={{
            gridColumn: "1 / -1", display: "flex", gap: 6, alignItems: "center",
            padding: "6px 4px",
          }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
              placeholder="Enter name…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4,
                color: "#F4EAD8", padding: "9px 12px",
                fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600,
                outline: "none",
              }}
            />
            <button onClick={submitNew} style={{
              padding: "9px 14px", borderRadius: 4, border: "none",
              background: "#E8C77A", color: "#0E0B08",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
            }}>Add</button>
            <button onClick={() => { setAdding(false); setNewName(""); }} style={{
              padding: "9px 10px", borderRadius: 4, border: "none",
              background: "transparent", color: "rgba(244,234,216,0.4)",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
            }}>×</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            gridColumn: "1 / -1",
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 4,
            background: "transparent",
            border: "1px dashed rgba(255,255,255,0.12)",
            color: "rgba(244,234,216,0.4)", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add person
          </button>
        )}
      </div>
    </window.Modal>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
