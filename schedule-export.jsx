// Phone screensaver export for the complete daily schedule.

const { useState: useStateSE, useEffect: useEffectSE, useMemo: useMemoSE } = React;

const SCHEDULE_EXPORT_WIDTH = 1290;
const SCHEDULE_EXPORT_HEIGHT = 2796;

function scheduleExportPeople(state) {
  const extras = state.extraFriends || [];
  return [...window.FRIENDS, ...extras.filter(f => !window.FRIENDS.some(x => x.name === f.name))];
}

function scheduleExportInterest(state, artistId) {
  const fans = state.fans[artistId] || [];
  const mustSee = (state.mustSeeByArtist || {})[artistId] || [];
  const curious = (state.curiousByArtist || {})[artistId] || [];
  return [...new Set([...mustSee, ...fans, ...curious])];
}

function scheduleExportPickStyle(state, artistId, person) {
  if (((state.mustSeeByArtist || {})[artistId] || []).includes(person)) {
    return { kind: "must-see", color: "#F2D27F", fill: "#342B18" };
  }
  if (((state.curiousByArtist || {})[artistId] || []).includes(person)) {
    return { kind: "curious", color: "#3FB8B0", fill: "#15302E" };
  }
  if ((state.fans[artistId] || []).includes(person)) {
    return { kind: "like", color: "#E8553F", fill: "#351C18" };
  }
  return null;
}

function scheduleExportPersonColor(state, name) {
  return scheduleExportPeople(state).find(f => f.name === name)?.color || "#9B8E7D";
}

function roundScheduleRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function drawFittedScheduleText(ctx, text, x, y, maxWidth, size, weight, color) {
  let fontSize = size;
  do {
    ctx.font = `${weight} ${fontSize}px "Bricolage Grotesque", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  } while (fontSize > 18);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawScheduleExport(state, day, person) {
  const canvas = document.createElement("canvas");
  canvas.width = SCHEDULE_EXPORT_WIDTH;
  canvas.height = SCHEDULE_EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  const stages = ["water", "air", "earth", "fire"];
  const shows = window.ARTISTS.filter(a => a.day === day);
  const minMinutes = Math.floor(Math.min(...shows.map(a => toMin(a.timeStart))) / 60) * 60;
  const maxMinutes = Math.ceil(Math.max(...shows.map(a => toMin(a.timeEnd))) / 60) * 60;

  const bg = ctx.createLinearGradient(0, 0, SCHEDULE_EXPORT_WIDTH, SCHEDULE_EXPORT_HEIGHT);
  bg.addColorStop(0, "#231B13");
  bg.addColorStop(0.5, "#0E0B08");
  bg.addColorStop(1, "#17100C");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SCHEDULE_EXPORT_WIDTH, SCHEDULE_EXPORT_HEIGHT);

  // Keep the top clear for a phone clock and widgets.
  ctx.fillStyle = "#E8C77A";
  ctx.font = '700 30px "JetBrains Mono", monospace';
  ctx.textBaseline = "top";
  ctx.fillText("ELEMENTS · 2026", 64, 300);
  ctx.fillStyle = "#F4EAD8";
  ctx.font = '800 78px "Bricolage Grotesque", sans-serif';
  ctx.fillText(day.toUpperCase(), 64, 342);
  ctx.fillStyle = "rgba(244,234,216,0.68)";
  ctx.font = '600 30px "Inter Tight", sans-serif';
  ctx.fillText(`Full schedule · ${person}'s picks highlighted`, 64, 438);

  const gridX = 64;
  const gridY = 540;
  const axisWidth = 78;
  const gridWidth = SCHEDULE_EXPORT_WIDTH - gridX * 2;
  const columnGap = 12;
  const columnWidth = (gridWidth - axisWidth - columnGap * 3) / 4;
  const gridHeight = 2070;
  const minuteScale = gridHeight / (maxMinutes - minMinutes);

  stages.forEach((stage, index) => {
    const tint = window.STAGE_TINTS[stage];
    const x = gridX + axisWidth + index * (columnWidth + columnGap);
    ctx.fillStyle = tint.bg;
    roundScheduleRect(ctx, x, gridY - 58, columnWidth, 46, 12);
    ctx.fill();
    ctx.fillStyle = tint.fg;
    ctx.font = '800 24px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(tint.label, x + columnWidth / 2, gridY - 49);
  });
  ctx.textAlign = "left";

  for (let minute = minMinutes; minute <= maxMinutes; minute += 60) {
    const y = gridY + (minute - minMinutes) * minuteScale;
    ctx.strokeStyle = "rgba(244,234,216,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gridX + axisWidth, y);
    ctx.lineTo(gridX + gridWidth, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,234,216,0.7)";
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textBaseline = "middle";
    ctx.fillText(window.fmtClock(`${String(Math.floor(minute / 60)).padStart(2, "0")}:00`), gridX, y);
  }

  shows.forEach(show => {
    const stageIndex = stages.indexOf(show.stage);
    const x = gridX + axisWidth + stageIndex * (columnWidth + columnGap);
    const y = gridY + (toMin(show.timeStart) - minMinutes) * minuteScale + 4;
    const height = Math.max(86, (toMin(show.timeEnd) - toMin(show.timeStart)) * minuteScale - 8);
    const tint = window.STAGE_TINTS[show.stage];
    const interested = scheduleExportInterest(state, show.id);
    const pickStyle = scheduleExportPickStyle(state, show.id, person);
    const selected = !!pickStyle;

    ctx.fillStyle = selected ? pickStyle.fill : tint.bg;
    roundScheduleRect(ctx, x, y, columnWidth, height, 14);
    ctx.fill();
    ctx.strokeStyle = selected ? pickStyle.color : `${tint.fg}88`;
    ctx.lineWidth = selected ? 6 : 2;
    roundScheduleRect(ctx, x, y, columnWidth, height, 14);
    ctx.stroke();

    if (selected) {
      ctx.fillStyle = pickStyle.color;
      roundScheduleRect(ctx, x + 9, y + 9, 12, Math.max(18, height - 18), 6);
      ctx.fill();
    }

    const textX = x + (selected ? 32 : 14);
    const textWidth = columnWidth - (selected ? 44 : 28);
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(244,234,216,0.72)";
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(window.fmtClock(show.timeStart), textX, y + 12);
    drawFittedScheduleText(ctx, show.artist, textX, y + 39, textWidth, 28, 750, "#F4EAD8");

    const sortedNames = [...interested].sort((a, b) => (a === person ? -1 : b === person ? 1 : a.localeCompare(b)));
    const maxChips = 4;
    const visible = sortedNames.slice(0, maxChips);
    const overflow = sortedNames.length - visible.length;
    const chipSize = 28;
    const chipGap = 6;
    const chipsY = y + height - chipSize - 10;
    visible.forEach((name, index) => {
      const chipX = textX + index * (chipSize + chipGap);
      ctx.fillStyle = scheduleExportPersonColor(state, name);
      ctx.beginPath();
      ctx.arc(chipX + chipSize / 2, chipsY + chipSize / 2, chipSize / 2, 0, Math.PI * 2);
      ctx.fill();
      if (name === person) {
        ctx.strokeStyle = pickStyle?.color || "#FFF1B8";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = "#0E0B08";
      ctx.font = '800 16px "Inter Tight", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name[0].toUpperCase(), chipX + chipSize / 2, chipsY + chipSize / 2 + 1);
    });
    if (overflow > 0) {
      const chipX = textX + visible.length * (chipSize + chipGap);
      ctx.fillStyle = "rgba(244,234,216,0.16)";
      ctx.beginPath();
      ctx.arc(chipX + chipSize / 2, chipsY + chipSize / 2, chipSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F4EAD8";
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${overflow}`, chipX + chipSize / 2, chipsY + chipSize / 2 + 1);
    }
    ctx.textAlign = "left";
  });

  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textBaseline = "top";
  ctx.fillStyle = "#E8553F";
  ctx.fillText("♥ LIKE", 64, 2672);
  ctx.fillStyle = "#3FB8B0";
  ctx.fillText("? CURIOUS", 190, 2672);
  ctx.fillStyle = "#F2D27F";
  ctx.fillText("★ MUST SEE", 356, 2672);
  ctx.fillStyle = "rgba(244,234,216,0.58)";
  ctx.font = '500 20px "Inter Tight", sans-serif';
  ctx.fillText("Colored initials show group interest · outlined initial is selected person", 64, 2712);
  return canvas;
}

function ScheduleExportSheet({ open, onClose, state, currentUser, initialDay = "Friday", onToast }) {
  const [day, setDay] = useStateSE(initialDay);
  const [person, setPerson] = useStateSE(currentUser);
  const [preview, setPreview] = useStateSE("");
  const people = useMemoSE(() => scheduleExportPeople(state), [state.extraFriends]);

  useEffectSE(() => { if (open) { setDay(initialDay); setPerson(currentUser); } }, [open, initialDay, currentUser]);
  useEffectSE(() => {
    if (!open || !person) return;
    let cancelled = false;
    Promise.resolve(document.fonts?.ready).catch(() => {}).then(() => {
      if (!cancelled) setPreview(drawScheduleExport(state, day, person).toDataURL("image/png"));
    });
    return () => { cancelled = true; };
  }, [open, day, person, state]);

  const makeExport = async () => {
    await Promise.resolve(document.fonts?.ready).catch(() => {});
    const canvas = drawScheduleExport(state, day, person);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("This browser could not create the PNG.");
    const filename = `elements-2026-${day.toLowerCase()}-${person.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-screensaver.png`;
    return { blob, filename };
  };

  const download = async () => {
    try {
      const { blob, filename } = await makeExport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      onToast?.(`${day} screensaver downloaded`);
    } catch (error) {
      onToast?.(error.message);
    }
  };

  const shareToPhotos = async () => {
    try {
      const { blob, filename } = await makeExport();
      const file = new File([blob], filename, { type: "image/png" });
      if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) {
        await download();
        onToast?.("Image sharing is unavailable here, so the PNG was downloaded instead.");
        return;
      }
      await navigator.share({ files: [file], title: `${day} · Elements 2026 schedule` });
    } catch (error) {
      if (error?.name !== "AbortError") onToast?.(error.message);
    }
  };

  return (
    <window.Sheet open={open} onClose={onClose} title="Schedule screensaver" subtitle="The full day stays visible; your selected person's picks are highlighted.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 28, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <ScheduleExportSelect label="Day" value={day} onChange={setDay} options={["Friday", "Saturday", "Sunday"]}/>
          <ScheduleExportSelect label="Highlight picks for" value={person} onChange={setPerson} options={people.map(p => p.name)}/>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(244,234,216,0.58)" }}>
            <span style={{ color: "#E8553F", fontWeight: 700 }}>♥ Like</span>{" · "}
            <span style={{ color: "#3FB8B0", fontWeight: 700 }}>? Curious</span>{" · "}
            <span style={{ color: "#F2D27F", fontWeight: 700 }}>★ Must see</span>
            <br/>The border color shows {person}'s pick type. Initial chips show everyone interested; busy sets collapse extras into a +N marker.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={shareToPhotos} disabled={!preview} style={{ padding: "14px 18px", border: 0, borderRadius: 4, background: "#E8C77A", color: "#0E0B08", fontSize: 14, fontWeight: 800, cursor: preview ? "pointer" : "wait" }}>
              Save/share to Photos
            </button>
            <button onClick={download} disabled={!preview} style={{ padding: "11px 18px", borderRadius: 4, background: "transparent", color: "rgba(244,234,216,0.7)", border: "1px solid rgba(255,255,255,0.14)", fontSize: 13, fontWeight: 700, cursor: preview ? "pointer" : "wait" }}>
              Download to Files instead
            </button>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(244,234,216,0.4)" }}>
            On iPhone, tap “Save Image” in the share sheet to add it to Photos.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", minHeight: 420 }}>
          {preview ? <img src={preview} alt={`${day} schedule screensaver preview`} style={{ width: "100%", maxWidth: 310, display: "block", borderRadius: 18, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}/> : <div style={{ color: "rgba(244,234,216,0.45)" }}>Rendering preview…</div>}
        </div>
      </div>
    </window.Sheet>
  );
}

function ScheduleExportSelect({ label, value, onChange, options }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(244,234,216,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
    {label}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.14)", background: "#0E0B08", color: "#F4EAD8", fontSize: 14 }}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}

Object.assign(window, { ScheduleExportSheet });
