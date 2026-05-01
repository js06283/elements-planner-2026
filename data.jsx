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
  // Friday
  { day: "Friday",   artist: "Above & Beyond",      genre: "Trance" },
  { day: "Friday",   artist: "ATLiens",             genre: "Bass" },
  { day: "Friday",   artist: "Big Gigantic",         genre: "Electronic/Funk" },
  { day: "Friday",   artist: "Boys Noize",           genre: "Electro House" },
  { day: "Friday",   artist: "Chris Lake",           genre: "House" },
  { day: "Friday",   artist: "Crankdat",             genre: "Dubstep" },
  { day: "Friday",   artist: "Excision",             genre: "Dubstep" },
  { day: "Friday",   artist: "Ganja White Night",    genre: "Dubstep" },
  { day: "Friday",   artist: "Its Murph",            genre: "House" },
  { day: "Friday",   artist: "Juelz",               genre: "Trap",    searchAs: "Juelz DJ electronic" },
  { day: "Friday",   artist: "Kettama",             genre: "Techno" },
  { day: "Friday",   artist: "Mersiv",              genre: "Dubstep" },
  { day: "Friday",   artist: "Zingara",             genre: "Bass" },
  { day: "Friday",   artist: "Driftire",            genre: "Bass" },
  { day: "Friday",   artist: "Dreya V",             genre: "House" },
  { day: "Friday",   artist: "Effin",               genre: "Dubstep" },
  { day: "Friday",   artist: "Gorillat",            genre: "Trap" },
  { day: "Friday",   artist: "Ivy Lab",             genre: "Experimental Bass" },
  { day: "Friday",   artist: "Kaleena Zanders",     genre: "House" },
  { day: "Friday",   artist: "Lumasi",              genre: "Bass" },
  { day: "Friday",   artist: "MCRT",               genre: "Bass" },
  { day: "Friday",   artist: "Splintered Sunlight", genre: "Jam Band" },
  { day: "Friday",   artist: "Wonkywilla",          genre: "Bass" },
  { day: "Friday",   artist: "X Club",             genre: "Techno" },
  { day: "Friday",   artist: "Ammo Amor",           genre: "House" },
  { day: "Friday",   artist: "Bardz",              genre: "House" },
  { day: "Friday",   artist: "Gavin Black",         genre: "Dubstep" },
  { day: "Friday",   artist: "Jellybean",           genre: "House" },
  { day: "Friday",   artist: "Kattana",            genre: "Techno" },
  // Saturday
  { day: "Saturday", artist: "A-Trak",             genre: "House" },
  { day: "Saturday", artist: "Ayybo",              genre: "House" },
  { day: "Saturday", artist: "Cloonee",            genre: "Tech House" },
  { day: "Saturday", artist: "Clozee",             genre: "World Bass" },
  { day: "Saturday", artist: "Hedex",              genre: "Drum & Bass" },
  { day: "Saturday", artist: "HOL!",               genre: "Dubstep",  searchAs: "HOL! dubstep" },
  { day: "Saturday", artist: "Level Up",           genre: "Dubstep",  searchAs: "Level Up dubstep" },
  { day: "Saturday", artist: "Louis The Child",    genre: "Future Bass" },
  { day: "Saturday", artist: "Matroda",            genre: "Tech House" },
  { day: "Saturday", artist: "MPH",               genre: "House",    searchAs: "MPH house music" },
  { day: "Saturday", artist: "Of The Trees",       genre: "Experimental Bass" },
  { day: "Saturday", artist: "Ray Volpe",          genre: "Dubstep" },
  { day: "Saturday", artist: "Subtronics",         genre: "Dubstep" },
  { day: "Saturday", artist: "Svdden Death",       genre: "Dubstep" },
  { day: "Saturday", artist: "Westend",            genre: "House" },
  { day: "Saturday", artist: "Biscuits",           genre: "Jam Band" },
  { day: "Saturday", artist: "Disciple",           genre: "Dubstep" },
  { day: "Saturday", artist: "Linska",             genre: "House" },
  { day: "Saturday", artist: "Nikita The Wicked",  genre: "Bass" },
  { day: "Saturday", artist: "Opio",               genre: "Bass" },
  { day: "Saturday", artist: "ProbCause",          genre: "Hip-Hop" },
  { day: "Saturday", artist: "Roddy Lima",         genre: "House" },
  { day: "Saturday", artist: "Sippy",              genre: "Dubstep" },
  { day: "Saturday", artist: "Skysia",             genre: "Melodic Bass" },
  { day: "Saturday", artist: "98.49",              genre: "House" },
  { day: "Saturday", artist: "Alec B2B Ecamp",     genre: "House" },
  { day: "Saturday", artist: "Earth Signs",        genre: "Electronic", searchAs: "Earth Signs music" },
  { day: "Saturday", artist: "Miel",               genre: "House" },
  { day: "Saturday", artist: "Pafyon",             genre: "House" },
  { day: "Saturday", artist: "Refrakt",            genre: "Bass" },
  { day: "Saturday", artist: "Sirens",             genre: "House",    searchAs: "Sirens house DJ" },
  // Sunday
  { day: "Sunday",   artist: "Acraze",             genre: "House" },
  { day: "Sunday",   artist: "Charlotte de Witte", genre: "Techno" },
  { day: "Sunday",   artist: "Daily Bread",        genre: "Electro-Soul" },
  { day: "Sunday",   artist: "I Hate Models",      genre: "Techno" },
  { day: "Sunday",   artist: "LSDream",            genre: "Bass" },
  { day: "Sunday",   artist: "Porter Robinson",    genre: "Electronic/Pop" },
  { day: "Sunday",   artist: "Sub Focus",          genre: "Drum & Bass" },
  { day: "Sunday",   artist: "Tiga",               genre: "Techno" },
  { day: "Sunday",   artist: "Tractorbeam",        genre: "Jam/Electronic" },
  { day: "Sunday",   artist: "Walker & Royce",     genre: "Tech House" },
  { day: "Sunday",   artist: "YDG",               genre: "Dubstep" },
  { day: "Sunday",   artist: "Azecca",             genre: "Techno" },
  { day: "Sunday",   artist: "Chyl",               genre: "Bass" },
  { day: "Sunday",   artist: "Golden Pony",        genre: "House" },
  { day: "Sunday",   artist: "Jackie Hollander",   genre: "House" },
  { day: "Sunday",   artist: "Know Good",          genre: "Bass",     searchAs: "Know Good bass music" },
  { day: "Sunday",   artist: "Marvel Years",       genre: "Funk/Electronic", searchAs: "Marvel Years producer" },
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
    const stage = stageForGenre(row.genre);
    counters[row.day][stage] = (counters[row.day][stage] || 0);
    const slot = slotsByDay[row.day][counters[row.day][stage] % slotsByDay[row.day].length];
    counters[row.day][stage] += 1;
    return {
      ...row,
      id: `art-${idx}`,
      stage,
      timeStart: slot,
      // 50 min sets
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
