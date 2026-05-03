// Vibe tab — triangle plot letting users place themselves in the House / Bass / Techno space.

const { useState: useVibeState, useRef: useVibeRef } = React;

// SVG viewBox 0 0 600 560
const VTX = {
  H: { x: 300, y: 44  },  // House  — top
  B: { x: 52,  y: 502 },  // Bass   — bottom-left
  T: { x: 548, y: 502 },  // Techno — bottom-right
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

// Pre-plotted artists — hand-tuned to feel accurate
const VIBE_ARTISTS = [
  { name: "Chris Lake",         h: 0.82, b: 0.08, t: 0.10 },
  { name: "Charlotte de Witte", h: 0.05, b: 0.06, t: 0.89 },
  { name: "Subtronics",         h: 0.06, b: 0.88, t: 0.06 },
  { name: "Porter Robinson",    h: 0.46, b: 0.35, t: 0.19 },
];

// Subcategory labels along the edges and interior
// Each has barycentric position + a text anchor hint
const SUBGENRES = [
  // Edge midpoints
  { label: "Tech House",   h: 0.46, b: 0.04, t: 0.50, anchor: "middle" },
  { label: "Future Bass",  h: 0.46, b: 0.50, t: 0.04, anchor: "middle" },
  { label: "Drum & Bass",  h: 0.04, b: 0.49, t: 0.47, anchor: "middle" },
  // Interior zone labels
  { label: "Hard Techno",    h: 0.10, b: 0.14, t: 0.76, anchor: "middle" },
  { label: "Melodic Techno", h: 0.26, b: 0.05, t: 0.69, anchor: "middle" },
  { label: "Dubstep",        h: 0.08, b: 0.76, t: 0.16, anchor: "middle" },
  { label: "Trap",           h: 0.18, b: 0.72, t: 0.10, anchor: "middle" },
  { label: "Deep House",     h: 0.74, b: 0.16, t: 0.10, anchor: "middle" },
  { label: "UK Garage",      h: 0.60, b: 0.28, t: 0.12, anchor: "middle" },
];

function pct(v) { return `${Math.round(v * 100)}%`; }

function VibeView({ state, dispatch, currentUser, onPickProfile }) {
  const [hovered, setHovered] = useVibeState(null);
  const svgRef = useVibeRef(null);

  const vibePositions = state.vibePositions || {};
  const myPos = vibePositions[currentUser];

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
    dispatch({ type: "setVibePosition", user: currentUser, pos: bary });
  }

  function handleMouseMove(e) {
    const pt = getSvgPoint(e);
    if (!pt) { setHovered(null); return; }

    for (const [name, pos] of Object.entries(vibePositions)) {
      const sv = baryToSvg(pos.h, pos.b, pos.t);
      if (Math.hypot(pt.x - sv.x, pt.y - sv.y) < 20) {
        setHovered({ kind: "user", name, ...pos, ...sv });
        return;
      }
    }
    for (const a of VIBE_ARTISTS) {
      const sv = baryToSvg(a.h, a.b, a.t);
      if (Math.hypot(pt.x - sv.x, pt.y - sv.y) < 16) {
        setHovered({ kind: "artist", name: a.name, h: a.h, b: a.b, t: a.t, ...sv });
        return;
      }
    }
    setHovered(null);
  }

  const triPts = `${VTX.H.x},${VTX.H.y} ${VTX.B.x},${VTX.B.y} ${VTX.T.x},${VTX.T.y}`;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 800,
          fontSize: 28, color: "#F4EAD8", margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>Genre Vibe Map</h2>
        {currentUser ? (
          <p style={{ color: "rgba(244,234,216,0.45)", fontSize: 13, margin: 0 }}>
            Click inside the triangle to place yourself.
          </p>
        ) : (
          <button onClick={onPickProfile} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 6,
            background: "rgba(232,199,122,0.10)",
            border: "1px solid rgba(232,199,122,0.35)",
            color: "#E8C77A", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 16 }}>👤</span>
            Pick your profile to place yourself on the map →
          </button>
        )}
      </div>

      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <svg
          ref={svgRef}
          viewBox="0 0 600 560"
          style={{ width: "100%", display: "block", cursor: currentUser ? "crosshair" : "default" }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
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
          </defs>

          {/* Gradient fills */}
          <polygon points={triPts} fill="url(#hGlow)" stroke="none"/>
          <polygon points={triPts} fill="url(#bGlow)" stroke="none"/>
          <polygon points={triPts} fill="url(#tGlow)" stroke="none"/>

          {/* Triangle border */}
          <polygon points={triPts} fill="none" stroke="rgba(244,234,216,0.14)" strokeWidth="1.5"/>

          {/* Subtle inner guide lines from each vertex to opposite midpoint */}
          {[
            [VTX.H, { x: (VTX.B.x + VTX.T.x) / 2, y: (VTX.B.y + VTX.T.y) / 2 }],
            [VTX.B, { x: (VTX.H.x + VTX.T.x) / 2, y: (VTX.H.y + VTX.T.y) / 2 }],
            [VTX.T, { x: (VTX.H.x + VTX.B.x) / 2, y: (VTX.H.y + VTX.B.y) / 2 }],
          ].map(([a, b], i) => (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="rgba(244,234,216,0.05)" strokeWidth="1" strokeDasharray="4 6"
            />
          ))}

          {/* Vertex labels */}
          <text x={VTX.H.x} y={VTX.H.y - 16} textAnchor="middle"
            fill="#E8C77A" fontSize="15" fontFamily="'Bricolage Grotesque', serif"
            fontWeight="700" letterSpacing="0.1em">HOUSE</text>
          <text x={VTX.B.x} y={VTX.B.y + 30} textAnchor="middle"
            fill="#E8553F" fontSize="15" fontFamily="'Bricolage Grotesque', serif"
            fontWeight="700" letterSpacing="0.1em">BASS</text>
          <text x={VTX.T.x} y={VTX.T.y + 30} textAnchor="middle"
            fill="#7FB7E8" fontSize="15" fontFamily="'Bricolage Grotesque', serif"
            fontWeight="700" letterSpacing="0.1em">TECHNO</text>

          {/* Vertex anchor dots */}
          <circle cx={VTX.H.x} cy={VTX.H.y} r="3.5" fill="#E8C77A" opacity="0.7"/>
          <circle cx={VTX.B.x} cy={VTX.B.y} r="3.5" fill="#E8553F" opacity="0.7"/>
          <circle cx={VTX.T.x} cy={VTX.T.y} r="3.5" fill="#7FB7E8" opacity="0.7"/>

          {/* Subgenre zone labels */}
          {SUBGENRES.map(s => {
            const sv = baryToSvg(s.h, s.b, s.t);
            return (
              <text key={s.label}
                x={sv.x} y={sv.y}
                textAnchor={s.anchor}
                fill="rgba(244,234,216,0.28)"
                fontSize="10"
                fontFamily="'Inter Tight', sans-serif"
                fontWeight="500"
                letterSpacing="0.05em"
                fontStyle="italic"
              >{s.label}</text>
            );
          })}

          {/* Artist dots — rendered above subgenre labels, below user dots */}
          {VIBE_ARTISTS.map(a => {
            const sv = baryToSvg(a.h, a.b, a.t);
            const isHov = hovered?.kind === "artist" && hovered?.name === a.name;
            return (
              <g key={a.name}>
                <circle
                  cx={sv.x} cy={sv.y} r={isHov ? 9 : 6}
                  fill="rgba(244,234,216,0.65)"
                  stroke="rgba(244,234,216,0.4)" strokeWidth="1"
                />
                <text x={sv.x} y={sv.y + 17} textAnchor="middle"
                  fill="rgba(244,234,216,0.5)" fontSize="9"
                  fontFamily="'Inter Tight', sans-serif" fontWeight="600"
                >{a.name}</text>
              </g>
            );
          })}

          {/* User dots */}
          {Object.entries(vibePositions).map(([name, pos]) => {
            const friend = (window.FRIENDS || []).find(f => f.name === name);
            const color = friend?.color || "#F4EAD8";
            const sv = baryToSvg(pos.h, pos.b, pos.t);
            const isSelf = name === currentUser;
            const isHov = hovered?.kind === "user" && hovered?.name === name;
            const r = isSelf ? 14 : 11;
            return (
              <g key={name}>
                {isSelf && (
                  <circle cx={sv.x} cy={sv.y} r={r + 7}
                    fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.3"/>
                )}
                <circle
                  cx={sv.x} cy={sv.y} r={isHov && !isSelf ? 13 : r}
                  fill={color}
                  fillOpacity={isSelf ? 1 : 0.78}
                  filter={isSelf ? "url(#vibeGlow)" : "none"}
                />
                <text x={sv.x} y={sv.y + 4.5} textAnchor="middle"
                  fill="#0E0B08" fontSize={isSelf ? "11" : "9.5"}
                  fontFamily="'Inter Tight', sans-serif" fontWeight="800"
                >{name.charAt(0)}</text>
                <text x={sv.x} y={sv.y + r + 14} textAnchor="middle"
                  fill={color} fillOpacity={isSelf ? 1 : 0.85}
                  fontSize={isSelf ? "11" : "10"}
                  fontFamily="'Inter Tight', sans-serif" fontWeight="700"
                >{name}</text>
              </g>
            );
          })}

          {/* Tooltip on hover */}
          {hovered && (() => {
            const tx = Math.min(Math.max(hovered.x, 90), 510);
            const ty = hovered.y < 120 ? hovered.y + 42 : hovered.y - 54;
            const sub = `${pct(hovered.h)} House · ${pct(hovered.b)} Bass · ${pct(hovered.t)} Techno`;
            return (
              <g pointerEvents="none">
                <rect x={tx - 90} y={ty - 18} width={180} height={38}
                  rx={5} fill="rgba(14,11,8,0.93)"
                  stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
                <text x={tx} y={ty - 2} textAnchor="middle"
                  fill="#F4EAD8" fontSize="11.5"
                  fontFamily="'Inter Tight', sans-serif" fontWeight="700">{hovered.name}</text>
                <text x={tx} y={ty + 13} textAnchor="middle"
                  fill="rgba(244,234,216,0.5)" fontSize="9.5"
                  fontFamily="'Inter Tight', sans-serif">{sub}</text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Your position card */}
      {myPos && currentUser && (
        <div style={{
          marginTop: 16,
          padding: "14px 18px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <window.Avatar name={currentUser} size={32}/>
          <div>
            <div style={{ color: "#F4EAD8", fontSize: 14, fontWeight: 700 }}>{currentUser}</div>
            <div style={{ color: "rgba(244,234,216,0.5)", fontSize: 12, marginTop: 2 }}>
              {pct(myPos.h)} House · {pct(myPos.b)} Bass · {pct(myPos.t)} Techno
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: "setVibePosition", user: currentUser, pos: null })}
            style={{
              marginLeft: "auto", background: "transparent", border: "none",
              color: "rgba(244,234,216,0.3)", cursor: "pointer",
              fontSize: 20, lineHeight: 1, padding: "2px 6px",
            }}
            title="Remove my position"
          >×</button>
        </div>
      )}

      {/* Who's on the map */}
      {Object.keys(vibePositions).length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(vibePositions).map(([name, pos]) => {
            const friend = (window.FRIENDS || []).find(f => f.name === name);
            const color = friend?.color || "#F4EAD8";
            return (
              <div key={name} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "5px 10px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${color}30`,
                borderRadius: 20,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}/>
                <span style={{ color, fontSize: 12, fontWeight: 600 }}>{name}</span>
                <span style={{ color: "rgba(244,234,216,0.35)", fontSize: 11 }}>
                  {pct(pos.h)}H · {pct(pos.b)}B · {pct(pos.t)}T
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.VibeView = VibeView;
