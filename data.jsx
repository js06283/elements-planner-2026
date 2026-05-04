// Elements 2026 — lineup + mock song catalog + friends + colors.
// Songs are curated examples to make the prototype feel real; in production
// these would come from Spotify Web API search.

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

// Stage colors (placeholder until set times drop — assigned by genre family)
const STAGE_TINTS = {
  water:   { fg: "#7FB7E8", bg: "#1A2840", label: "WATER" },
  air:     { fg: "#A6D49F", bg: "#1A3024", label: "AIR" },
  earth:   { fg: "#D4A574", bg: "#2E2419", label: "EARTH" },
  fire:    { fg: "#E8836B", bg: "#3A1E18", label: "FIRE" },
};

// Genre → stage tint
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

const LINEUP = [
  // ── Friday Fire ──────────────────────────────────────────────────────────────
  { day: "Friday",   stage: "fire",  artist: "ATLiens",             genre: "Bass" },
  { day: "Friday",   stage: "fire",  artist: "Crankdat",            genre: "Dubstep" },
  { day: "Friday",   stage: "fire",  artist: "Excision",            genre: "Dubstep" },
  { day: "Friday",   stage: "fire",  artist: "Ganja White Night",   genre: "Dubstep" },
  { day: "Friday",   stage: "fire",  artist: "Mersiv",              genre: "Dubstep" },
  { day: "Friday",   stage: "fire",  artist: "Zingara",             genre: "Bass" },
  // ── Friday Earth ─────────────────────────────────────────────────────────────
  { day: "Friday",   stage: "earth", artist: "Above & Beyond",      genre: "Trance" },
  { day: "Friday",   stage: "earth", artist: "Chris Lake",          genre: "House" },
  { day: "Friday",   stage: "earth", artist: "It's Murph",          genre: "House" },
  { day: "Friday",   stage: "earth", artist: "Jigitz",              genre: "Trap" },
  { day: "Friday",   stage: "earth", artist: "Dirtwire",            genre: "Bass" },
  { day: "Friday",   stage: "earth", artist: "Kaleena Zanders",     genre: "House" },
  { day: "Friday",   stage: "earth", artist: "Splintered Sunlight", genre: "Jam Band" },
  // ── Friday (Water / Air — stage TBD) ─────────────────────────────────────────
  { day: "Friday",   artist: "Big Gigantic",        genre: "Electronic/Funk" },
  { day: "Friday",   artist: "Boys Noize",           genre: "Electro House" },
  { day: "Friday",   artist: "Kettama",              genre: "Techno" },
  { day: "Friday",   artist: "Dreya V",              genre: "House" },
  { day: "Friday",   artist: "Effin",                genre: "Dubstep" },
  { day: "Friday",   artist: "Gorillat",             genre: "Trap" },
  { day: "Friday",   artist: "Ivy Lab",              genre: "Experimental Bass" },
  { day: "Friday",   artist: "Lumasi",               genre: "Bass" },
  { day: "Friday",   artist: "MCRT",                 genre: "Bass" },
  { day: "Friday",   artist: "Wonkywilla",           genre: "Bass" },
  { day: "Friday",   artist: "X Club",               genre: "Techno" },
  { day: "Friday",   artist: "Ammo Amor",            genre: "House" },
  { day: "Friday",   artist: "Bardz",                genre: "House" },
  { day: "Friday",   artist: "Gavin Black",          genre: "Dubstep" },
  { day: "Friday",   artist: "Jellybean",            genre: "House" },
  { day: "Friday",   artist: "Kattana",              genre: "Techno" },
  // ── Saturday Fire ────────────────────────────────────────────────────────────
  { day: "Saturday", stage: "fire",  artist: "Ayybo",              genre: "House" },
  { day: "Saturday", stage: "fire",  artist: "Cloonee",            genre: "Tech House" },
  { day: "Saturday", stage: "fire",  artist: "Louis The Child",    genre: "Future Bass" },
  { day: "Saturday", stage: "fire",  artist: "Matroda",            genre: "Tech House" },
  { day: "Saturday", stage: "fire",  artist: "Westend",            genre: "House" },
  { day: "Saturday", stage: "fire",  artist: "9B49",               genre: "House" },
  { day: "Saturday", stage: "fire",  artist: "Alec B2B ECamp",     genre: "House" },
  { day: "Saturday", stage: "fire",  artist: "Earth Signs",        genre: "Electronic", searchAs: "Earth Signs music" },
  // ── Saturday Earth ───────────────────────────────────────────────────────────
  { day: "Saturday", stage: "earth", artist: "Clozee",             genre: "World Bass" },
  { day: "Saturday", stage: "earth", artist: "Level Up",           genre: "Dubstep",  searchAs: "Level Up dubstep" },
  { day: "Saturday", stage: "earth", artist: "Of The Trees",       genre: "Experimental Bass" },
  { day: "Saturday", stage: "earth", artist: "Subtronics",         genre: "Dubstep" },
  { day: "Saturday", stage: "earth", artist: "Opiou",              genre: "Bass" },
  { day: "Saturday", stage: "earth", artist: "ProbCause",          genre: "Hip-Hop" },
  { day: "Saturday", stage: "earth", artist: "Skysia",             genre: "Melodic Bass" },
  // ── Saturday (Water / Air — stage TBD) ───────────────────────────────────────
  { day: "Saturday", artist: "A-Trak",             genre: "House" },
  { day: "Saturday", artist: "Hedex",              genre: "Drum & Bass" },
  { day: "Saturday", artist: "HOL!",               genre: "Dubstep",  searchAs: "HOL! dubstep" },
  { day: "Saturday", artist: "MPH",                genre: "House",    searchAs: "MPH house music" },
  { day: "Saturday", artist: "Ray Volpe",          genre: "Dubstep" },
  { day: "Saturday", artist: "Svdden Death",       genre: "Dubstep" },
  { day: "Saturday", artist: "Biscuits",           genre: "Jam Band" },
  { day: "Saturday", artist: "Disciple",           genre: "Dubstep" },
  { day: "Saturday", artist: "Linska",             genre: "House" },
  { day: "Saturday", artist: "Nikita The Wicked",  genre: "Bass" },
  { day: "Saturday", artist: "Roddy Lima",         genre: "House" },
  { day: "Saturday", artist: "Sippy",              genre: "Dubstep" },
  { day: "Saturday", artist: "Miel",               genre: "House" },
  { day: "Saturday", artist: "Pafyon",             genre: "House" },
  { day: "Saturday", artist: "Refrakt",            genre: "Bass" },
  { day: "Saturday", artist: "Sirens",             genre: "House",    searchAs: "Sirens house DJ" },
  // ── Sunday Fire ──────────────────────────────────────────────────────────────
  { day: "Sunday",   stage: "fire",  artist: "Charlotte de Witte", genre: "Techno" },
  { day: "Sunday",   stage: "fire",  artist: "GRiZ",               genre: "Electronic/Funk" },
  { day: "Sunday",   stage: "fire",  artist: "I Hate Models",      genre: "Techno" },
  { day: "Sunday",   stage: "fire",  artist: "Tiga",               genre: "Techno" },
  { day: "Sunday",   stage: "fire",  artist: "Azzecca",            genre: "Techno" },
  // ── Sunday Earth ─────────────────────────────────────────────────────────────
  { day: "Sunday",   stage: "earth", artist: "Daily Bread",        genre: "Electro-Soul" },
  { day: "Sunday",   stage: "earth", artist: "LSDream",            genre: "Bass" },
  { day: "Sunday",   stage: "earth", artist: "Porter Robinson",    genre: "Electronic/Pop" },
  { day: "Sunday",   stage: "earth", artist: "Tractorbeam",        genre: "Jam/Electronic" },
  { day: "Sunday",   stage: "earth", artist: "Know Good",          genre: "Bass",     searchAs: "Know Good bass music" },
  { day: "Sunday",   stage: "earth", artist: "Marvel Years",       genre: "Funk/Electronic", searchAs: "Marvel Years producer" },
  // ── Sunday (Water / Air — stage TBD) ─────────────────────────────────────────
  { day: "Sunday",   artist: "Acraze",             genre: "House" },
  { day: "Sunday",   artist: "Sub Focus",          genre: "Drum & Bass" },
  { day: "Sunday",   artist: "Walker & Royce",     genre: "Tech House" },
  { day: "Sunday",   artist: "YDG",               genre: "Dubstep" },
  { day: "Sunday",   artist: "Chyl",               genre: "Bass" },
  { day: "Sunday",   artist: "Golden Pony",        genre: "House" },
  { day: "Sunday",   artist: "Jackie Hollander",   genre: "House" },
  { day: "Sunday",   artist: "Thought Process",    genre: "Bass" },
  { day: "Sunday",   artist: "Will Clarke",        genre: "Tech House" },
  { day: "Sunday",   artist: "Barz",               genre: "Hip-Hop" },
  { day: "Sunday",   artist: "Dr. Chunga",         genre: "Electronic" },
  { day: "Sunday",   artist: "Koopmusik",          genre: "Electronic" },
  { day: "Sunday",   artist: "Luna Mar",           genre: "House" },
  { day: "Sunday",   artist: "Pynth",              genre: "Electronic" },
];

// Friday/Saturday/Sunday bias: assign each artist a stage tint deterministically
// based on genre, then sprinkle scheduled times so the Schedule view has data.
function assignTimes() {
  // Each day: 5 hours of programming, ~50min slots.
  const slotsByDay = {
    Friday:   ["18:00","18:50","19:40","20:30","21:20","22:10","23:00","23:50"],
    Saturday: ["17:00","17:50","18:40","19:30","20:20","21:10","22:00","22:50","23:40"],
    Sunday:   ["16:00","16:50","17:40","18:30","19:20","20:10","21:00","21:50"],
  };
  const stages = ["water", "air", "earth", "fire"];
  const counters = { Friday: {}, Saturday: {}, Sunday: {} };
  return LINEUP.map((row, idx) => {
    const stage = row.stage || stageForGenre(row.genre);
    counters[row.day][stage] = (counters[row.day][stage] || 0);
    const slot = slotsByDay[row.day][counters[row.day][stage] % slotsByDay[row.day].length];
    counters[row.day][stage] += 1;
    return {
      ...row,
      id: `art-${idx}`,
      stage,
      timeStart: slot,
      timeEnd: addMinutes(slot, 50),
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

const ARTISTS = assignTimes();

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
  FRIENDS, ARTISTS, STAGE_TINTS, TRACK_CATALOG,
  stageForGenre, coverFor, searchTracks, tracksForArtist, addMinutes,
});
