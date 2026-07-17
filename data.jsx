// Elements 2026 — lineup + set times + mock song catalog + friends + colors.
// Songs are curated examples to make the prototype feel real; in production
// these would come from Spotify Web API search.
//
// SET TIMES are OFFICIAL — transcribed from the final Friday/Saturday/Sunday
// "Music Set Times" graphics released by the festival (Aug 7–9, 2026, Long Pond
// PA). Times are stored in a canonical 24h form where post-midnight sets use
// 24:00–26:00 (e.g. 12:40am is "24:40", 2:00am is "26:00") so the timeline view
// sorts correctly across midnight. Use fmtClock() to render a friendly 12-hour
// label. Yoga / Mass Meditation wellness slots are omitted.

const FRIENDS = [
  { name: "Jess",   color: "#E8553F" },  // coral
  { name: "Theo",   color: "#3FB8B0" },  // teal
  { name: "Andy",   color: "#5AA9E6" },  // sky
  { name: "Noel",   color: "#7FB069" },  // moss
  { name: "Kevin",  color: "#C68A2E" },  // amber
  { name: "Ellen",  color: "#B978C9" },  // plum
  { name: "Cindy",  color: "#E89BB0" },  // rose
  { name: "PJ",     color: "#6FB4A0" },  // seafoam
  { name: "Steve",  color: "#E87F3F" },  // orange
  { name: "Sophie", color: "#A47BD4" },  // violet
  { name: "James",  color: "#4DC9B0" },  // mint
  { name: "Ray",    color: "#E8A030" },  // golden orange
];

// Stage colors. Elements runs four stages: EARTH, FIRE, AIR, WATER.
const STAGE_TINTS = {
  water:   { fg: "#7FB7E8", bg: "#1A2840", label: "WATER" },
  air:     { fg: "#A6D49F", bg: "#1A3024", label: "AIR" },
  earth:   { fg: "#D4A574", bg: "#2E2419", label: "EARTH" },
  fire:    { fg: "#E8836B", bg: "#3A1E18", label: "FIRE" },
};

// Genre → stage tint (kept as a fallback; stages are now explicit in SCHEDULE).
function stageForGenre(g) {
  const x = g.toLowerCase();
  if (x.includes("dubstep") || x.includes("riddim") || x.includes("bass") || x.includes("trap")) return "fire";
  if (x.includes("techno") || x.includes("trance") || x.includes("psy")) return "earth";
  if (x.includes("tech house") || x.includes("house") || x.includes("electro")) return "water";
  return "air";
}

// Fake but plausible color-swatch "covers". We synthesize gradient art per song
// since we have no real album-art URLs. Hash of song-id → 2 hues.
function coverFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h >> 4) % 80) % 360;
  const lightness = 38 + (h >> 8) % 18;
  return { hue1, hue2, lightness };
}

const TRACK_CATALOG = {};

// ── OFFICIAL set times ───────────────────────────────────────────────────────
// One row per set: { day, stage, artist, genre, start, end, [note], [searchAs], [id] }
// start/end are canonical 24h strings ("HH:MM", with 24–26 for after-midnight).
const SCHEDULE = [
  // ════════════════ FRIDAY ════════════════
  // ── Earth ──
  { day: "Friday", stage: "earth", artist: "Splintered Sunlight", genre: "Jam Band",        start: "15:45", end: "17:00" },
  { day: "Friday", stage: "earth", artist: "Dirtwire",            genre: "Bass",            start: "17:30", end: "18:30" },
  { day: "Friday", stage: "earth", artist: "Kaleena Zanders",     genre: "House",           start: "19:00", end: "20:00" },
  { day: "Friday", stage: "earth", artist: "Jigitz",              genre: "Trap",            start: "20:00", end: "21:00" },
  { day: "Friday", stage: "earth", artist: "It's Murph",          genre: "House",           start: "21:00", end: "22:15", id: "art-its-murph" }, // was "Its Murph" — keep prior state
  { day: "Friday", stage: "earth", artist: "Above & Beyond",      genre: "Trance",          start: "22:25", end: "23:55" },
  { day: "Friday", stage: "earth", artist: "Chris Lake",          genre: "House",           start: "24:00", end: "25:30" },
  // ── Fire ──
  { day: "Friday", stage: "fire",  artist: "Dice Man B2B Mikayli", genre: "House",          start: "17:45", end: "18:45" },
  { day: "Friday", stage: "fire",  artist: "Mersiv",              genre: "Dubstep",         start: "18:45", end: "19:45", note: "Slowdown Set" },
  { day: "Friday", stage: "fire",  artist: "Ganja White Night",   genre: "Dubstep",         start: "19:45", end: "21:00", note: "Sunset Set" },
  { day: "Friday", stage: "fire",  artist: "Zingara",             genre: "Bass",            start: "21:15", end: "22:15" },
  { day: "Friday", stage: "fire",  artist: "ATLiens",             genre: "Bass",            start: "22:15", end: "23:15" },
  { day: "Friday", stage: "fire",  artist: "Crankdat",            genre: "Dubstep",         start: "23:20", end: "24:35" },
  { day: "Friday", stage: "fire",  artist: "Excision",            genre: "Dubstep",         start: "24:45", end: "26:00" },
  // ── Air ──
  { day: "Friday", stage: "air",   artist: "Fable",               genre: "House",           start: "12:00", end: "13:30" },
  { day: "Friday", stage: "air",   artist: "Gavin Blac",          genre: "Dubstep",         start: "13:30", end: "15:00", id: "art-gavin-black" }, // was "Gavin Black" — keep prior state
  { day: "Friday", stage: "air",   artist: "Ammo Amor",           genre: "House",           start: "15:00", end: "16:30" },
  { day: "Friday", stage: "air",   artist: "Bardo",               genre: "House",           start: "16:30", end: "18:00", id: "art-bardz" }, // was "Bardz" — keep prior state
  { day: "Friday", stage: "air",   artist: "Dreya V",             genre: "House",           start: "18:00", end: "19:30" },
  { day: "Friday", stage: "air",   artist: "X Club.",             genre: "Techno",          start: "19:30", end: "21:00" },
  { day: "Friday", stage: "air",   artist: "MCR-T",               genre: "Bass",            start: "21:00", end: "22:30", id: "art-mcrt" }, // was "MCRT" — keep prior state
  { day: "Friday", stage: "air",   artist: "Kettama",             genre: "Techno",          start: "22:30", end: "24:30" },
  { day: "Friday", stage: "air",   artist: "Boys Noize",          genre: "Electro House",   start: "24:30", end: "26:00" },
  // ── Water ──
  { day: "Friday", stage: "water", artist: "Jelly Bean",          genre: "House",           start: "12:30", end: "13:30", id: "art-jellybean" }, // was "Jellybean" — keep prior state
  { day: "Friday", stage: "water", artist: "Kattana",             genre: "Techno",          start: "13:30", end: "14:30" },
  { day: "Friday", stage: "water", artist: "DJ Shakey B2B Illexxandra", genre: "House",     start: "14:30", end: "15:30", id: "art-dj-shakey-b2b" }, // was "DJ Shakey B2B" — keep prior state
  { day: "Friday", stage: "water", artist: "Rudashi",             genre: "House",           start: "15:30", end: "17:00" },
  { day: "Friday", stage: "water", artist: "SubFeels",            genre: "Bass",            start: "17:00", end: "18:15" },
  { day: "Friday", stage: "water", artist: "Wonkywilla",          genre: "Bass",            start: "18:25", end: "19:25" },
  { day: "Friday", stage: "water", artist: "Effin",               genre: "Dubstep",         start: "19:25", end: "20:25" },
  { day: "Friday", stage: "water", artist: "Ivy Lab",             genre: "Experimental Bass", start: "20:25", end: "21:25" },
  { day: "Friday", stage: "water", artist: "Gorilla T",           genre: "Trap",            start: "21:25", end: "22:25", id: "art-gorillat" }, // was "Gorillat" — keep prior state
  { day: "Friday", stage: "water", artist: "Big Gigantic",        genre: "Electronic/Funk", start: "22:30", end: "23:30" },
  { day: "Friday", stage: "water", artist: "Mickman",             genre: "House",           start: "23:30", end: "24:45" },

  // ════════════════ SATURDAY ════════════════
  // ── Earth ──
  { day: "Saturday", stage: "earth", artist: "Skysia",            genre: "Melodic Bass",    start: "16:15", end: "17:15" },
  { day: "Saturday", stage: "earth", artist: "ProbCause",         genre: "Hip-Hop",         start: "17:30", end: "18:30" },
  { day: "Saturday", stage: "earth", artist: "Opiuo",             genre: "Bass",            start: "18:45", end: "19:45", id: "art-opiou" }, // was "Opiou" — keep prior state
  { day: "Saturday", stage: "earth", artist: "CloZee",            genre: "World Bass",      start: "20:00", end: "21:15", note: "Sunset Set" },
  { day: "Saturday", stage: "earth", artist: "Level Up",          genre: "Dubstep",         start: "21:45", end: "23:00", searchAs: "Level Up dubstep" },
  { day: "Saturday", stage: "earth", artist: "Of The Trees",      genre: "Experimental Bass", start: "23:15", end: "24:30" },
  { day: "Saturday", stage: "earth", artist: "Subtronics",        genre: "Dubstep",         start: "24:45", end: "26:00" },
  // ── Fire ──
  { day: "Saturday", stage: "fire",  artist: "Alec B2B ECamp",    genre: "House",           start: "16:00", end: "17:00" },
  { day: "Saturday", stage: "fire",  artist: "Earth Signs",       genre: "Electronic",      start: "17:00", end: "18:00" },
  { day: "Saturday", stage: "fire",  artist: "9B49",              genre: "House",           start: "18:00", end: "19:00" },
  { day: "Saturday", stage: "fire",  artist: "Louis The Child",   genre: "Future Bass",     start: "19:00", end: "20:15", note: "Sunset Set" },
  { day: "Saturday", stage: "fire",  artist: "Westend",           genre: "House",           start: "20:15", end: "21:15" },
  { day: "Saturday", stage: "fire",  artist: "Ayybo",             genre: "House",           start: "21:30", end: "22:45" },
  { day: "Saturday", stage: "fire",  artist: "Matroda",           genre: "Tech House",      start: "22:45", end: "24:00" },
  { day: "Saturday", stage: "fire",  artist: "Cloonee",           genre: "Tech House",      start: "24:00", end: "25:30" },
  // ── Air ──
  { day: "Saturday", stage: "air",   artist: "Eric Remy",         genre: "House",           start: "12:30", end: "13:45" },
  { day: "Saturday", stage: "air",   artist: "Refrakt",           genre: "Bass",            start: "13:45", end: "15:15" },
  { day: "Saturday", stage: "air",   artist: "Sirens",            genre: "House",           start: "15:15", end: "16:45", searchAs: "Sirens house DJ" },
  { day: "Saturday", stage: "air",   artist: "A-Trak",            genre: "House",           start: "16:45", end: "18:15" },
  { day: "Saturday", stage: "air",   artist: "Papyon",            genre: "House",           start: "18:15", end: "19:45", id: "art-pafyon" }, // was "Pafyon" — keep prior state
  { day: "Saturday", stage: "air",   artist: "Roddy Lima",        genre: "House",           start: "19:45", end: "21:15" },
  { day: "Saturday", stage: "air",   artist: "Discip",            genre: "Dubstep",         start: "21:30", end: "23:00", id: "art-disciple" }, // was "Disciple" — keep prior state
  { day: "Saturday", stage: "air",   artist: "Linska",            genre: "House",           start: "23:00", end: "24:30" },
  { day: "Saturday", stage: "air",   artist: "Biscits",           genre: "Tech House",      start: "24:30", end: "26:00", id: "art-biscuits" }, // renamed from "Biscuits" — keep prior state
  // ── Water ──
  { day: "Saturday", stage: "water", artist: "DCAL",              genre: "House",           start: "12:15", end: "13:15" },
  { day: "Saturday", stage: "water", artist: "Henry Pope",        genre: "House",           start: "13:15", end: "14:15" },
  { day: "Saturday", stage: "water", artist: "MPH",               genre: "House",           start: "14:15", end: "15:30", searchAs: "MPH house music" },
  { day: "Saturday", stage: "water", artist: "MLE",               genre: "House",           start: "15:30", end: "16:45" },
  { day: "Saturday", stage: "water", artist: "Surprise Guest",    genre: "TBA",             start: "16:45", end: "18:00", id: "art-surprise-set" }, // was "Surprise Set" — keep prior state
  { day: "Saturday", stage: "water", artist: "Nikita, The Wicked", genre: "Bass",           start: "18:15", end: "19:15" },
  { day: "Saturday", stage: "water", artist: "Sippy",             genre: "Dubstep",         start: "19:15", end: "20:15" },
  { day: "Saturday", stage: "water", artist: "Hedex",             genre: "Drum & Bass",     start: "20:15", end: "21:15" },
  { day: "Saturday", stage: "water", artist: "HOL!",              genre: "Dubstep",         start: "21:30", end: "22:30", searchAs: "HOL! dubstep" },
  { day: "Saturday", stage: "water", artist: "Ray Volpe",         genre: "Dubstep",         start: "22:30", end: "23:45" },
  { day: "Saturday", stage: "water", artist: "Svdden Death",      genre: "Dubstep",         start: "23:45", end: "25:00" },

  // ════════════════ SUNDAY ════════════════
  // ── Earth ──
  { day: "Sunday", stage: "earth", artist: "Marvel Years",        genre: "Funk/Electronic", start: "15:45", end: "16:45", searchAs: "Marvel Years producer" },
  { day: "Sunday", stage: "earth", artist: "The Motet",           genre: "Funk",            start: "17:10", end: "18:10" },
  { day: "Sunday", stage: "earth", artist: "Tractorbeam",         genre: "Jam/Electronic",  start: "18:40", end: "19:55" },
  { day: "Sunday", stage: "earth", artist: "Know Good",           genre: "Bass",            start: "20:40", end: "21:40", searchAs: "Know Good bass music" },
  { day: "Sunday", stage: "earth", artist: "Daily Bread",         genre: "Electro-Soul",    start: "21:50", end: "23:05" },
  { day: "Sunday", stage: "earth", artist: "LSDream",             genre: "Bass",            start: "23:15", end: "24:30" },
  { day: "Sunday", stage: "earth", artist: "Porter Robinson",     genre: "Electronic/Pop",  start: "24:45", end: "26:00", note: "DJ Set" },
  // ── Fire ──
  { day: "Sunday", stage: "fire",  artist: "Swolldan",            genre: "House",           start: "16:00", end: "17:00" },
  { day: "Sunday", stage: "fire",  artist: "Elements B2B",        genre: "House",           start: "17:00", end: "18:00" },
  { day: "Sunday", stage: "fire",  artist: "Josh Teed",           genre: "Livetronica",     start: "18:00", end: "19:05" },
  { day: "Sunday", stage: "fire",  artist: "GRiZ",                genre: "Electronic/Funk", start: "19:20", end: "20:35", note: "Chasing The Golden Hour" },
  { day: "Sunday", stage: "fire",  artist: "Azzecca",             genre: "Techno",          start: "20:45", end: "21:45" },
  { day: "Sunday", stage: "fire",  artist: "Tiga",                genre: "Techno",          start: "21:45", end: "22:50" },
  { day: "Sunday", stage: "fire",  artist: "Charlotte de Witte",  genre: "Techno",          start: "23:00", end: "24:30" },
  { day: "Sunday", stage: "fire",  artist: "I Hate Models",       genre: "Techno",          start: "24:30", end: "26:00" },
  // ── Air ──
  { day: "Sunday", stage: "air",   artist: "Jon Eye",             genre: "House",           start: "12:30", end: "13:30" },
  { day: "Sunday", stage: "air",   artist: "Alchemy Vibrations",  genre: "Bass",            start: "13:30", end: "14:30" },
  { day: "Sunday", stage: "air",   artist: "Luna Mar",            genre: "House",           start: "14:30", end: "15:45" },
  { day: "Sunday", stage: "air",   artist: "Barz",                genre: "Hip-Hop",         start: "15:45", end: "17:00" },
  { day: "Sunday", stage: "air",   artist: "Golden Pony",         genre: "House",           start: "17:00", end: "18:30" },
  { day: "Sunday", stage: "air",   artist: "Dr. Chaii",           genre: "Electronic",      start: "18:30", end: "20:00", id: "art-dr-chunga" }, // renamed from "Dr. Chunga" — keep prior state
  { day: "Sunday", stage: "air",   artist: "Jackie Hollander",    genre: "House",           start: "20:00", end: "21:30" },
  { day: "Sunday", stage: "air",   artist: "Will Clarke",         genre: "Tech House",      start: "21:30", end: "23:00" },
  { day: "Sunday", stage: "air",   artist: "Acraze",              genre: "House",           start: "23:00", end: "24:30" },
  { day: "Sunday", stage: "air",   artist: "Walker & Royce",      genre: "Tech House",      start: "24:30", end: "26:00" },
  // ── Water ──
  { day: "Sunday", stage: "water", artist: "Lightcode",           genre: "Melodic Bass",    start: "11:15", end: "12:15", note: "by LSDream" },
  { day: "Sunday", stage: "water", artist: "Pnther",              genre: "Electronic",      start: "12:30", end: "13:30", id: "art-pynth" }, // renamed from "Pynth" — keep prior state
  { day: "Sunday", stage: "water", artist: "Brainrack",           genre: "Bass",            start: "13:30", end: "14:30" },
  { day: "Sunday", stage: "water", artist: "Auracle",             genre: "Electronic",      start: "14:30", end: "15:30" },
  { day: "Sunday", stage: "water", artist: "Zejibo",              genre: "Electronic",      start: "15:30", end: "16:30" },
  { day: "Sunday", stage: "water", artist: "Thought Process",     genre: "Bass",            start: "16:30", end: "17:30" },
  { day: "Sunday", stage: "water", artist: "Cloud Conductor",     genre: "Electronic",      start: "17:40", end: "18:40" },
  { day: "Sunday", stage: "water", artist: "Lumasi",              genre: "Bass",            start: "18:45", end: "19:45" },
  { day: "Sunday", stage: "water", artist: "Koopmusik",           genre: "Electronic",      start: "20:15", end: "21:30" },
  { day: "Sunday", stage: "water", artist: "CHYL",                genre: "Bass",            start: "21:30", end: "22:30" },
  { day: "Sunday", stage: "water", artist: "YDG",                 genre: "Dubstep",         start: "22:30", end: "23:45" },
  { day: "Sunday", stage: "water", artist: "Sub Focus",           genre: "Drum & Bass",     start: "23:45", end: "25:00" },
];

// Build the ARTISTS list from SCHEDULE. Stable slug id — never changes when the
// lineup is reordered or an artist's stage/time is updated, so saved
// fan/song/comment state stays attached. A row may also pin an explicit `id`
// to inherit a renamed act's prior state (see ID overrides in SCHEDULE).
function buildArtists() {
  return SCHEDULE.map((row) => {
    const id = row.id ||
      "art-" + row.artist.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      ...row,
      id,
      timeStart: row.start,
      timeEnd: row.end,
      tracks: TRACK_CATALOG[row.artist] || [],
    };
  });
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;
}

// Render a canonical 24h+ time ("24:40") as a friendly 12-hour label ("12:40am").
function fmtClock(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  h = h % 24;
  const ampm = h >= 12 ? "pm" : "am";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2,"0")}${ampm}`;
}

const ARTISTS = buildArtists();

// "Search Spotify": scans all tracks across all artists for a query.
// In production this would hit Spotify Web API — here we search the catalog.
function searchTracks(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const a of ARTISTS) {
    for (const t of a.tracks) {
      const hay = `${a.artist} ${t.title} ${t.album}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({ ...t, artist: a.artist, artistId: a.id });
        if (results.length >= 30) return results;
      }
    }
  }
  return results;
}

// Searching by artist name returns all that artist's tracks.
function tracksForArtist(artistName) {
  const a = ARTISTS.find(x => x.artist === artistName);
  return a ? a.tracks.map(t => ({ ...t, artist: a.artist, artistId: a.id })) : [];
}

Object.assign(window, {
  FRIENDS, ARTISTS, SCHEDULE, STAGE_TINTS, TRACK_CATALOG,
  stageForGenre, coverFor, fmtClock, searchTracks, tracksForArtist, addMinutes,
});
