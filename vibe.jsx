// Vibe tab — triangle plot + profile builder (photo/emoji, bio, vibe position).

const { useState: useVibeState, useRef: useVibeRef, useEffect: useVibeEffect } = React;

const VTX = {
  H: { x: 300, y: 44  },
  B: { x: 52,  y: 502 },
  T: { x: 548, y: 502 },
};

function baryToSvg(h, b, t) {
  return {
    x: h * VTX.H.x + b * VTX.B.x + t * VTX.T.x,
    y: h * VTX.H.y + b * VTX.B.y + t * VTX.T.y,
  };
}

function svgToBary(px, py) {
  const { H, B, T } = VTX;
  const denom = (B.y - T.y) * (H.x - T.x) + (T.x - B.x) * (H.y - T.y);
  const h = ((B.y - T.y) * (px - T.x) + (T.x - B.x) * (py - T.y)) / denom;
  const b = ((T.y - H.y) * (px - T.x) + (H.x - T.x) * (py - T.y)) / denom;
  const t = 1 - h - b;
  if (h < -0.02 || b < -0.02 || t < -0.02) return null;
  return {
    h: Math.max(0, Math.min(1, h)),
    b: Math.max(0, Math.min(1, b)),
    t: Math.max(0, Math.min(1, t)),
  };
}

const VIBE_ARTISTS = [
  { name: "Chris Lake",         h: 0.82, b: 0.08, t: 0.10 },
  { name: "Charlotte de Witte", h: 0.05, b: 0.06, t: 0.89 },
  { name: "Subtronics",         h: 0.06, b: 0.88, t: 0.06 },
  { name: "Porter Robinson",    h: 0.46, b: 0.35, t: 0.19 },
];

const SUBGENRES = [
  { label: "Tech House",    h: 0.46, b: 0.04, t: 0.50 },
  { label: "Future Bass",   h: 0.46, b: 0.50, t: 0.04 },
  { label: "Drum & Bass",   h: 0.04, b: 0.49, t: 0.47 },
  { label: "Hard Techno",   h: 0.10, b: 0.14, t: 0.76 },
  { label: "Melodic Techno",h: 0.26, b: 0.05, t: 0.69 },
  { label: "Dubstep",       h: 0.08, b: 0.76, t: 0.16 },
  { label: "Trap",          h: 0.18, b: 0.72, t: 0.10 },
  { label: "Deep House",    h: 0.74, b: 0.16, t: 0.10 },
  { label: "UK Garage",     h: 0.60, b: 0.28, t: 0.12 },
];

const EMOJIS = [
  "🎵","🎶","🎸","🎹","🎤","🎧","🥁","🎺","🎷","🎼",
  "🔊","🔥","⚡","🌊","🌙","☀️","🌸","🎉","🎪","💫",
  "🦋","🐺","🦊","🐉","👾","🤖","🎭","🌈","💎","🖤",
];

function pct(v) { return `${Math.round(v * 100)}%`; }

// Resize an image file to a square-cropped base64 JPEG for storage
async function resizeImage(file, size = 320) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width  - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

// ---- Lightbox ---------------------------------------------------------------
function Lightbox({ src, name, onClose }) {
  useVibeEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      cursor: 'zoom-out',
    }}>
      <img
        src={src}
        alt={name}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 'min(520px, 90vw)', maxHeight: '75vh',
          borderRadius: 12, boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          cursor: 'default',
        }}
      />
      <div style={{
        color: 'rgba(244,234,216,0.7)', fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14, fontWeight: 600,
      }}>{name}</div>
    </div>
  );
}

// ---- Avatar — photo circle with independent emoji badge -------------------
function ProfileAvatar({ name, profile, color, size = 96, onClick, editOverlay, avatarRef }) {
  const [hov, setHov] = useVibeState(false);
  const photo = profile?.photo;
  const emoji = profile?.emoji;
  const badgeSize = Math.round(size * 0.34);

  return (
    <div
      ref={avatarRef}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {/* Main circle: photo OR colored initial */}
      {photo ? (
        <img src={photo} alt={name} style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          border: `2px solid ${color}50`,
        }}/>
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.40, fontWeight: 800, color: '#0E0B08',
        }}>
          {name.charAt(0)}
        </div>
      )}

      {/* Emoji badge — sits bottom-right, always independent of photo */}
      {emoji && (
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          width: badgeSize, height: badgeSize, borderRadius: '50%',
          background: '#15110D', border: '2px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: badgeSize * 0.60, pointerEvents: 'none',
        }}>{emoji}</div>
      )}

      {/* Edit overlay for self */}
      {editOverlay && hov && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22 }}>✏️</span>
        </div>
      )}
    </div>
  );
}

// ---- Vibe bar (House / Bass / Techno horizontal) ---------------------------
function VibeBar({ h, b, t }) {
  const bars = [
    { label: 'House',  val: h, color: '#E8C77A' },
    { label: 'Bass',   val: b, color: '#E8553F' },
    { label: 'Techno', val: t, color: '#7FB7E8' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {bars.map(({ label, val, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 46, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
            color: 'rgba(244,234,216,0.45)', fontFamily: "'Inter Tight', sans-serif",
            textAlign: 'right',
          }}>{label}</span>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ width: `${val * 100}%`, height: '100%', borderRadius: 3, background: color, opacity: 0.85 }}/>
          </div>
          <span style={{
            width: 32, fontSize: 10, color: 'rgba(244,234,216,0.45)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{pct(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Edit avatar popover — fixed-positioned, two independent sections -----
function AvatarEditor({ profile, anchorRect, onSave, onClose }) {
  const fileRef = useVibeRef(null);
  const popRef = useVibeRef(null);

  // Close on outside click
  useVibeEffect(() => {
    const handler = e => { if (popRef.current && !popRef.current.contains(e.target)) onClose(); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const data = await resizeImage(file, 320);
    onSave({ photo: data }); // emoji untouched
    onClose();
  }

  // Position below the avatar, centered, but clamp to viewport
  const popWidth = 256;
  const left = Math.min(
    Math.max(8, anchorRect.left + anchorRect.width / 2 - popWidth / 2),
    window.innerWidth - popWidth - 8
  );
  const top = anchorRect.bottom + 10;

  return (
    <div ref={popRef}
      style={{
        position: 'fixed', top, left, width: popWidth, zIndex: 400,
        background: '#1A1510', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Photo section */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: 'rgba(244,234,216,0.35)', letterSpacing: '0.12em', marginBottom: 8,
        }}>PHOTO</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile}/>
        <button onClick={() => fileRef.current.click()} style={{
          width: '100%', padding: '9px 0', borderRadius: 6,
          border: '1px dashed rgba(255,255,255,0.2)',
          background: 'transparent', color: '#F4EAD8', cursor: 'pointer',
          fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
        }}>📷 Upload photo</button>
        {profile?.photo && (
          <button onClick={() => { onSave({ photo: null }); onClose(); }} style={{
            width: '100%', marginTop: 6, padding: '6px 0', borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'rgba(244,234,216,0.35)', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 12,
          }}>Remove photo</button>
        )}
      </div>

      {/* Emoji section — fully independent */}
      <div style={{ padding: '12px 14px 10px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: 'rgba(244,234,216,0.35)', letterSpacing: '0.12em', marginBottom: 8,
        }}>EMOJI BADGE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => onSave({ emoji: e })} style={{
              width: 34, height: 34, fontSize: 17, lineHeight: 1,
              background: profile?.emoji === e ? 'rgba(232,199,122,0.2)' : 'transparent',
              border: profile?.emoji === e ? '1px solid rgba(232,199,122,0.5)' : '1px solid transparent',
              borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{e}</button>
          ))}
        </div>
        {profile?.emoji && (
          <button onClick={() => onSave({ emoji: null })} style={{
            width: '100%', marginTop: 6, padding: '5px 0',
            border: 'none', background: 'transparent',
            color: 'rgba(244,234,216,0.3)', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
          }}>clear badge</button>
        )}
      </div>
    </div>
  );
}

// ---- Profile card ----------------------------------------------------------
function ProfileCard({ name, profile, vibePos, isSelf, onSave, onPhotoClick }) {
  const friend = (window.FRIENDS || []).find(f => f.name === name);
  const color = friend?.color || '#F4EAD8';
  const [editBio, setEditBio] = useVibeState(false);
  const [bio, setBio] = useVibeState(profile?.bio || '');
  const [showEditor, setShowEditor] = useVibeState(false);
  const avatarRef = useVibeRef(null);
  const [anchorRect, setAnchorRect] = useVibeState(null);

  useVibeEffect(() => {
    if (!editBio) setBio(profile?.bio || '');
  }, [profile?.bio, editBio]);

  function openEditor() {
    if (avatarRef.current) setAnchorRect(avatarRef.current.getBoundingClientRect());
    setShowEditor(true);
  }

  const hasPhoto = !!profile?.photo;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${isSelf ? 'rgba(232,199,122,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12,
    }}>
      {/* Top section — avatar + name + vibe */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <ProfileAvatar
            name={name} profile={profile} color={color} size={88}
            editOverlay={isSelf}
            avatarRef={avatarRef}
            onClick={isSelf ? openEditor : (hasPhoto ? () => onPhotoClick(profile.photo) : undefined)}
          />
          {isSelf && showEditor && anchorRect && (
            <AvatarEditor
              profile={profile}
              anchorRect={anchorRect}
              onSave={patch => onSave(patch)}
              onClose={() => setShowEditor(false)}
            />
          )}
        </div>

        {/* Name + vibe */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              color: '#F4EAD8', fontSize: 17, fontWeight: 700,
              fontFamily: "'Bricolage Grotesque', serif",
            }}>{name}</span>
            {isSelf && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: '#E8C77A', letterSpacing: '0.12em',
                border: '1px solid rgba(232,199,122,0.4)', borderRadius: 3,
                padding: '1px 5px',
              }}>YOU</span>
            )}
          </div>
          {vibePos ? (
            <VibeBar h={vibePos.h} b={vibePos.b} t={vibePos.t}/>
          ) : (
            <div style={{ color: 'rgba(244,234,216,0.25)', fontSize: 12, fontStyle: 'italic' }}>
              not placed yet
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginInline: 20 }}/>

      {/* Bio section */}
      <div style={{ padding: '14px 20px 18px' }}>
        {isSelf ? (
          editBio ? (
            <div>
              <textarea
                autoFocus
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                placeholder="tell the crew something about your taste..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                  color: '#F4EAD8', padding: '9px 11px', resize: 'none',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 13, lineHeight: 1.5,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => { onSave({ bio }); setEditBio(false); }} style={{
                  padding: '7px 14px', borderRadius: 5, border: 'none',
                  background: '#E8C77A', color: '#0E0B08',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}>Save</button>
                <button onClick={() => { setBio(profile?.bio || ''); setEditBio(false); }} style={{
                  padding: '7px 14px', borderRadius: 5, border: 'none',
                  background: 'transparent', color: 'rgba(244,234,216,0.4)',
                  fontFamily: "'Inter Tight', sans-serif", fontSize: 12, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditBio(true)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'transparent',
              border: bio ? 'none' : '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 6, padding: bio ? '0' : '9px 11px',
              cursor: 'pointer',
              color: bio ? '#F4EAD8' : 'rgba(244,234,216,0.28)',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, lineHeight: 1.5,
            }}>
              {bio || 'add a bio…'}
            </button>
          )
        ) : (
          profile?.bio
            ? <p style={{ color: 'rgba(244,234,216,0.65)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{profile.bio}</p>
            : <p style={{ color: 'rgba(244,234,216,0.2)', fontSize: 13, margin: 0, fontStyle: 'italic' }}>no bio yet</p>
        )}
      </div>
    </div>
  );
}

// ---- Main view -------------------------------------------------------------
function VibeView({ state, dispatch, currentUser, onPickProfile, onSaveVibePos }) {
  const [hovered, setHovered] = useVibeState(null);
  const [lightbox, setLightbox] = useVibeState(null); // { src, name }
  const [pendingPos, setPendingPos] = useVibeState(null); // unsaved click position
  const [saved, setSaved] = useVibeState(false); // flash "Saved!" feedback
  const svgRef = useVibeRef(null);

  const vibePositions = state.vibePositions || {};
  const profiles = state.profiles || {};

  function getSvgPoint(e) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (600 / rect.width),
      y: (e.clientY - rect.top)  * (560 / rect.height),
    };
  }

  function handleClick(e) {
    if (!currentUser) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    const bary = svgToBary(pt.x, pt.y);
    if (!bary) return;
    setPendingPos(bary);
    setSaved(false);
  }

  function handleSave() {
    if (!pendingPos) return;
    dispatch({ type: 'setVibePosition', user: currentUser, pos: pendingPos });
    onSaveVibePos(pendingPos);
    setPendingPos(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleMouseMove(e) {
    const pt = getSvgPoint(e);
    if (!pt) { setHovered(null); return; }
    for (const [name, pos] of Object.entries(vibePositions)) {
      const sv = baryToSvg(pos.h, pos.b, pos.t);
      if (Math.hypot(pt.x - sv.x, pt.y - sv.y) < 20) { setHovered({ kind: 'user', name, ...pos, ...sv }); return; }
    }
    for (const a of VIBE_ARTISTS) {
      const sv = baryToSvg(a.h, a.b, a.t);
      if (Math.hypot(pt.x - sv.x, pt.y - sv.y) < 16) { setHovered({ kind: 'artist', name: a.name, h: a.h, b: a.b, t: a.t, ...sv }); return; }
    }
    setHovered(null);
  }

  const triPts = `${VTX.H.x},${VTX.H.y} ${VTX.B.x},${VTX.B.y} ${VTX.T.x},${VTX.T.y}`;
  const allFriends = [...window.FRIENDS, ...(state.extraFriends || []).filter(f => !window.FRIENDS.find(x => x.name === f.name))];
  const squadOrder = [
    ...allFriends.filter(f => f.name === currentUser),
    ...allFriends.filter(f => f.name !== currentUser && vibePositions[f.name]),
    ...allFriends.filter(f => f.name !== currentUser && !vibePositions[f.name]),
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {lightbox && <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)}/>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 800,
          fontSize: 28, color: '#F4EAD8', margin: '0 0 10px', letterSpacing: '-0.02em',
        }}>Vibe Map</h2>
        {currentUser ? (
          <p style={{ color: 'rgba(244,234,216,0.45)', fontSize: 13, margin: 0 }}>
            {pendingPos
              ? 'Position selected — hit Save to lock it in.'
              : vibePositions[currentUser]
                ? 'Click to reposition yourself, then Save.'
                : 'Click inside the triangle to place yourself, then Save.'}
          </p>
        ) : (
          <button onClick={onPickProfile} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 6,
            background: 'rgba(232,199,122,0.10)', border: '1px solid rgba(232,199,122,0.35)',
            color: '#E8C77A', cursor: 'pointer',
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 16 }}>👤</span>
            Pick your profile to get started →
          </button>
        )}
      </div>

      {/* Triangle */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <svg ref={svgRef} viewBox="0 0 600 560"
          style={{ width: '100%', display: 'block', cursor: currentUser ? 'crosshair' : 'default' }}
          onClick={handleClick} onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}>
          <defs>
            <radialGradient id="hGlow" cx="50%" cy="8%" r="55%">
              <stop offset="0%" stopColor="#E8C77A" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#E8C77A" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="bGlow" cx="9%" cy="92%" r="55%">
              <stop offset="0%" stopColor="#E8553F" stopOpacity="0.20"/>
              <stop offset="100%" stopColor="#E8553F" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="tGlow" cx="91%" cy="92%" r="55%">
              <stop offset="0%" stopColor="#7FB7E8" stopOpacity="0.20"/>
              <stop offset="100%" stopColor="#7FB7E8" stopOpacity="0"/>
            </radialGradient>
            <filter id="vibeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="dotClip0"><circle cx="0" cy="0" r="16"/></clipPath>
            <clipPath id="dotClip1"><circle cx="0" cy="0" r="12"/></clipPath>
          </defs>

          <polygon points={triPts} fill="url(#hGlow)" stroke="none"/>
          <polygon points={triPts} fill="url(#bGlow)" stroke="none"/>
          <polygon points={triPts} fill="url(#tGlow)" stroke="none"/>
          <polygon points={triPts} fill="none" stroke="rgba(244,234,216,0.14)" strokeWidth="1.5"/>

          {[
            [VTX.H, { x: (VTX.B.x + VTX.T.x) / 2, y: (VTX.B.y + VTX.T.y) / 2 }],
            [VTX.B, { x: (VTX.H.x + VTX.T.x) / 2, y: (VTX.H.y + VTX.T.y) / 2 }],
            [VTX.T, { x: (VTX.H.x + VTX.B.x) / 2, y: (VTX.H.y + VTX.B.y) / 2 }],
          ].map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="rgba(244,234,216,0.05)" strokeWidth="1" strokeDasharray="4 6"/>
          ))}

          <text x={VTX.H.x} y={VTX.H.y - 16} textAnchor="middle" fill="#E8C77A" fontSize="15"
            fontFamily="'Bricolage Grotesque', serif" fontWeight="700" letterSpacing="0.1em">HOUSE</text>
          <text x={VTX.B.x} y={VTX.B.y + 30} textAnchor="middle" fill="#E8553F" fontSize="15"
            fontFamily="'Bricolage Grotesque', serif" fontWeight="700" letterSpacing="0.1em">BASS</text>
          <text x={VTX.T.x} y={VTX.T.y + 30} textAnchor="middle" fill="#7FB7E8" fontSize="15"
            fontFamily="'Bricolage Grotesque', serif" fontWeight="700" letterSpacing="0.1em">TECHNO</text>

          <circle cx={VTX.H.x} cy={VTX.H.y} r="3.5" fill="#E8C77A" opacity="0.7"/>
          <circle cx={VTX.B.x} cy={VTX.B.y} r="3.5" fill="#E8553F" opacity="0.7"/>
          <circle cx={VTX.T.x} cy={VTX.T.y} r="3.5" fill="#7FB7E8" opacity="0.7"/>

          {SUBGENRES.map(s => {
            const sv = baryToSvg(s.h, s.b, s.t);
            return (
              <text key={s.label} x={sv.x} y={sv.y} textAnchor="middle"
                fill="rgba(244,234,216,0.28)" fontSize="10"
                fontFamily="'Inter Tight', sans-serif" fontWeight="500"
                letterSpacing="0.05em" fontStyle="italic">{s.label}</text>
            );
          })}

          {VIBE_ARTISTS.map(a => {
            const sv = baryToSvg(a.h, a.b, a.t);
            const isHov = hovered?.kind === 'artist' && hovered?.name === a.name;
            return (
              <g key={a.name}>
                <circle cx={sv.x} cy={sv.y} r={isHov ? 9 : 6}
                  fill="rgba(244,234,216,0.65)" stroke="rgba(244,234,216,0.4)" strokeWidth="1"/>
                <text x={sv.x} y={sv.y + 17} textAnchor="middle"
                  fill="rgba(244,234,216,0.5)" fontSize="9"
                  fontFamily="'Inter Tight', sans-serif" fontWeight="600">{a.name}</text>
              </g>
            );
          })}

          {Object.entries(vibePositions).map(([name, pos], idx) => {
            const friend = allFriends.find(f => f.name === name);
            const color = friend?.color || '#F4EAD8';
            const prof = profiles[name];
            const photo = prof?.photo;
            const emoji = prof?.emoji;
            const sv = baryToSvg(pos.h, pos.b, pos.t);
            const isSelf = name === currentUser;
            const isHov = hovered?.kind === 'user' && hovered?.name === name;
            const r = isSelf ? 16 : 12;
            const clipId = `uc-${idx}`;
            return (
              <g key={name}>
                {isSelf && (
                  <circle cx={sv.x} cy={sv.y} r={r + 7}
                    fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.3"/>
                )}
                <defs>
                  <clipPath id={clipId}><circle cx={sv.x} cy={sv.y} r={r}/></clipPath>
                </defs>
                {photo ? (
                  <>
                    <circle cx={sv.x} cy={sv.y} r={r} fill={color}
                      filter={isSelf ? 'url(#vibeGlow)' : 'none'}/>
                    <image
                      href={photo}
                      x={sv.x - r} y={sv.y - r}
                      width={r * 2} height={r * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <circle cx={sv.x} cy={sv.y} r={isHov && !isSelf ? r + 2 : r}
                    fill={color} fillOpacity={isSelf ? 1 : 0.78}
                    filter={isSelf ? 'url(#vibeGlow)' : 'none'}/>
                )}
                {!photo && (
                  emoji ? (
                    <text x={sv.x} y={sv.y + (isSelf ? 6 : 5)} textAnchor="middle"
                      fontSize={isSelf ? '14' : '11'}>{emoji}</text>
                  ) : (
                    <text x={sv.x} y={sv.y + (isSelf ? 5.5 : 4.5)} textAnchor="middle"
                      fill="#0E0B08" fontSize={isSelf ? '12' : '10'}
                      fontFamily="'Inter Tight', sans-serif" fontWeight="800">{name.charAt(0)}</text>
                  )
                )}
                <text x={sv.x} y={sv.y + r + 14} textAnchor="middle"
                  fill={color} fillOpacity={isSelf ? 1 : 0.85}
                  fontSize={isSelf ? '11' : '10'}
                  fontFamily="'Inter Tight', sans-serif" fontWeight="700">{name}</text>
              </g>
            );
          })}

          {hovered && (() => {
            const tx = Math.min(Math.max(hovered.x, 90), 510);
            const ty = hovered.y < 120 ? hovered.y + 42 : hovered.y - 54;
            const sub = `${pct(hovered.h)} House · ${pct(hovered.b)} Bass · ${pct(hovered.t)} Techno`;
            return (
              <g pointerEvents="none">
                <rect x={tx - 90} y={ty - 18} width={180} height={38}
                  rx={5} fill="rgba(14,11,8,0.93)" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
                <text x={tx} y={ty - 2} textAnchor="middle" fill="#F4EAD8" fontSize="11.5"
                  fontFamily="'Inter Tight', sans-serif" fontWeight="700">{hovered.name}</text>
                <text x={tx} y={ty + 13} textAnchor="middle"
                  fill="rgba(244,234,216,0.5)" fontSize="9.5"
                  fontFamily="'Inter Tight', sans-serif">{sub}</text>
              </g>
            );
          })()}
          {/* Pending (unsaved) position ghost */}
          {pendingPos && (() => {
            const sv = baryToSvg(pendingPos.h, pendingPos.b, pendingPos.t);
            const friend = window.FRIENDS.find(f => f.name === currentUser) || {};
            const color = friend.color || '#F4EAD8';
            return (
              <g pointerEvents="none">
                <circle cx={sv.x} cy={sv.y} r={22} fill={color} fillOpacity="0.1" stroke={color} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 3"/>
                <circle cx={sv.x} cy={sv.y} r={16} fill={color} fillOpacity="0.5"/>
                <text x={sv.x} y={sv.y + 5.5} textAnchor="middle"
                  fill="#0E0B08" fontSize="12"
                  fontFamily="'Inter Tight', sans-serif" fontWeight="800">{currentUser.charAt(0)}</text>
              </g>
            );
          })()}
        </svg>

        {/* Save button — only shown while a pending position exists */}
        {pendingPos && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleSave} style={{
              padding: '9px 22px', borderRadius: 6, border: 'none',
              background: '#E8C77A', color: '#0E0B08',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}>Save position</button>
            <button onClick={() => setPendingPos(null)} style={{
              padding: '9px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'rgba(244,234,216,0.5)',
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}>Cancel</button>
          </div>
        )}
        {saved && !pendingPos && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#A6D49F', fontSize: 13, fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>
            ✓ Position saved
          </div>
        )}
      </div>

      {/* Squad */}
      {squadOrder.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: 'rgba(244,234,216,0.35)', letterSpacing: '0.14em', marginBottom: 16,
          }}>THE CREW</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {squadOrder.map(f => (
              <ProfileCard
                key={f.name}
                name={f.name}
                profile={profiles[f.name]}
                vibePos={vibePositions[f.name]}
                isSelf={f.name === currentUser}
                onSave={patch => dispatch({ type: 'setProfile', user: f.name, patch })}
                onPhotoClick={src => setLightbox({ src, name: f.name })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

window.VibeView = VibeView;
