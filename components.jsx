// Shared atomic components — avatars, song rows, album art, sheets.
// Each component is self-contained; styles object names are component-specific
// to avoid global collisions across babel scripts.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// — Album art tile (synthesized gradient + initials) ————————————————————————
function AlbumArt({ track, size = 64 }) {
  if (!track) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: "repeating-linear-gradient(45deg, #221b14 0 6px, #1a140e 6px 12px)",
      }}/>
    );
  }
  // Use real Spotify artwork if available
  if (track.artworkUrl) {
    return (
      <img src={track.artworkUrl} alt={track.title || ""}
        style={{ width: size, height: size, borderRadius: 4, objectFit: "cover", display: "block" }}/>
    );
  }
  const c = window.coverFor(track.id || track.spotifyTrackId || track.title || "");
  const initials = (track.title || "").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, overflow: "hidden",
      background: `linear-gradient(135deg, oklch(${c.lightness}% 0.18 ${c.hue1}) 0%, oklch(${c.lightness - 8}% 0.16 ${c.hue2}) 100%)`,
      display: "flex", alignItems: "flex-end", padding: 6,
      fontFamily: "'JetBrains Mono', monospace", fontSize: Math.max(8, size * 0.13),
      color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: "0.05em",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
    }}>
      {initials}
    </div>
  );
}

// — 2x2 album collage ————————————————————————
function AlbumCollage({ tracks, size = 220 }) {
  const filled = tracks.slice(0, 4);
  while (filled.length < 4) filled.push(null);
  const tile = (size - 2) / 2;
  return (
    <div style={{
      width: size, height: size,
      display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr",
      gap: 2, background: "#0e0b08", borderRadius: 2,
    }}>
      {filled.map((t, i) => (
        <AlbumArt key={t?.id || `empty-${i}`} track={t} size={tile} />
      ))}
    </div>
  );
}

// — Avatar (initials in colored circle) ————————————————————————
function Avatar({ name, size = 24, ring }) {
  const friend = window.FRIENDS.find(f => f.name === name);
  const color = friend ? friend.color : "#888";
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, color: "#0E0B08",
      fontFamily: "'Inter Tight', sans-serif",
      fontSize: size * 0.46, fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: ring ? `0 0 0 2px #0E0B08, 0 0 0 ${ring + 2}px ${color}` : "none",
      flexShrink: 0,
    }}>{initial}</div>
  );
}

// — Avatar stack with overflow ————————————————————————
function AvatarStack({ names, size = 24, max = 5, onClick }) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", cursor: onClick ? "pointer" : "default" }}>
      {visible.map((n, i) => (
        <div key={n} style={{ marginLeft: i === 0 ? 0 : -size * 0.34 }}>
          <Avatar name={n} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          marginLeft: -size * 0.34, width: size, height: size, borderRadius: "50%",
          background: "#1a140e", color: "#E8C77A", fontFamily: "'JetBrains Mono', monospace",
          fontSize: size * 0.4, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 2px #0E0B08",
        }}>+{overflow}</div>
      )}
    </div>
  );
}

// — Heart button ————————————————————————
function HeartButton({ active, count, onClick, size = 18 }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: active ? "rgba(232, 85, 63, 0.14)" : "transparent",
      color: active ? "#E8553F" : "rgba(255,255,255,0.6)",
      border: `1px solid ${active ? "rgba(232, 85, 63, 0.55)" : "rgba(255,255,255,0.1)"}`,
      padding: "4px 10px", borderRadius: 999,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
      cursor: "pointer", transition: "all 0.15s",
    }}>
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span>{count}</span>
    </button>
  );
}

// — Stage tag ————————————————————————
function StageTag({ stage }) {
  const tint = window.STAGE_TINTS[stage];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 8px", borderRadius: 2,
      background: tint.bg, color: tint.fg,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
      letterSpacing: "0.12em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tint.fg }}/>
      {tint.label}
    </span>
  );
}

// — Modal shell ————————————————————————
function Modal({ open, onClose, children, maxWidth = 720, required = false }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape" && !required) onClose(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose, required]);
  if (!open) return null;
  return (
    <div className="mobile-modal" onClick={required ? undefined : onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(8, 5, 3, 0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div className="mobile-modal-card" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth, maxHeight: "calc(100vh - 48px)",
        background: "#15110D", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
      }}>
        {children}
      </div>
    </div>
  );
}

// — Bottom sheet (export) ————————————————————————
function Sheet({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 199,
        background: open ? "rgba(8, 5, 3, 0.6)" : "transparent",
        backdropFilter: open ? "blur(6px)" : "none",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s, backdrop-filter 0.25s",
      }}/>
      <div className="mobile-sheet" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 200,
        background: "#15110D", borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px 12px 0 0",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          padding: "10px 0 8px", display: "flex", justifyContent: "center",
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}/>
        </div>
        {title && (
          <div className="mobile-sheet-heading" style={{ padding: "8px 28px 18px" }}>
            <h2 style={{
              fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700,
              fontSize: 28, lineHeight: 1.05, color: "#F4EAD8", margin: 0,
              letterSpacing: "-0.01em",
            }}>{title}</h2>
            {subtitle && (
              <p style={{ marginTop: 6, color: "rgba(244, 234, 216, 0.55)", fontSize: 14 }}>{subtitle}</p>
            )}
          </div>
        )}
        <div className="mobile-sheet-body" style={{ overflowY: "auto", flex: 1, padding: "0 28px 28px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// — Toast ————————————————————————
function Toast({ message, kind = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  const colors = {
    info:    { bg: "#15110D", fg: "#F4EAD8", border: "rgba(255,255,255,0.12)" },
    success: { bg: "#1a2418", fg: "#A6D49F", border: "rgba(166, 212, 159, 0.4)" },
    spotify: { bg: "#0d1f12", fg: "#1DB954", border: "rgba(29, 185, 84, 0.5)" },
    apple:   { bg: "#1f0d12", fg: "#FA2D48", border: "rgba(250, 45, 72, 0.5)" },
  }[kind];
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, animation: "slideUp 0.25s",
      background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}`,
      padding: "12px 20px", borderRadius: 4, fontSize: 14, fontWeight: 500,
      fontFamily: "'Inter Tight', sans-serif",
      boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
      maxWidth: 480,
    }}>{message}</div>
  );
}

// — Spotify / Apple Music brand glyphs ————————————————————————
function SpotifyGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.94-.601-.12-.42.18-.84.6-.94 4.561-1.021 8.52-.6 11.64 1.32.42.18.479.659.282 1.122zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

Object.assign(window, {
  AlbumArt, AlbumCollage, Avatar, AvatarStack, HeartButton,
  StageTag, Modal, Sheet, Toast, SpotifyGlyph,
});
