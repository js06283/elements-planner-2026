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
  if (x.includes("dubstep") || x.includes("riddim") || x.includes("bass")) return "fire";
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

// Mock track catalog. Each artist gets a handful of plausible/representative tracks.
// In production this would be `await spotify.search('artist:NAME')`.
const TRACK_CATALOG = {
  "ABOVE & BEYOND": [
    { id: "ab-sun", title: "Sun & Moon", album: "Group Therapy", duration: "6:36" },
    { id: "ab-thg", title: "Thing Called Love", album: "Group Therapy", duration: "6:51" },
    { id: "ab-bgrm", title: "Black Room Boy", album: "Common Ground", duration: "5:14" },
    { id: "ab-ffl",  title: "Free Flowing", album: "Common Ground", duration: "4:08" },
  ],
  "ATB": [
    { id: "atb-9pm",  title: "9 PM (Till I Come)", album: "Movin' Melodies", duration: "3:33" },
    { id: "atb-eclp", title: "Ecstasy", album: "No Silence", duration: "3:48" },
    { id: "atb-yourl", title: "Your Love (9 PM)", album: "Single", duration: "3:08" },
  ],
  "CHRIS LAKE": [
    { id: "cl-tut",  title: "Turn Off The Lights", album: "Single", duration: "3:18" },
    { id: "cl-ofu",  title: "Operator (Ring Ring)", album: "Single", duration: "3:32" },
    { id: "cl-dcd",  title: "Deceiver", album: "Single", duration: "3:54" },
    { id: "cl-pgi",  title: "Lose My Mind", album: "Single", duration: "2:48" },
  ],
  "CRANKDAT": [
    { id: "ck-wzt", title: "Wolfz", album: "Single", duration: "3:24" },
    { id: "ck-erp", title: "Erase Me", album: "Single", duration: "3:11" },
    { id: "ck-wld", title: "Worth It", album: "Single", duration: "3:01" },
  ],
  "EXCISION": [
    { id: "ex-ahn", title: "Throwin' Elbows", album: "Apex", duration: "3:48" },
    { id: "ex-rob", title: "Robo Kitty", album: "Apex", duration: "3:32" },
    { id: "ex-pty", title: "Death Wish", album: "Onyx", duration: "3:11" },
    { id: "ex-trc", title: "Reborn", album: "Onyx", duration: "3:24" },
  ],
  "GANJA WHITE NIGHT": [
    { id: "gwn-1", title: "Mr. Wobble", album: "Mr. Wobble", duration: "4:12" },
    { id: "gwn-2", title: "The Origin", album: "The Origin", duration: "5:01" },
    { id: "gwn-3", title: "One Two", album: "One Two", duration: "3:58" },
  ],
  "IT'S MURPH": [
    { id: "im-1", title: "Move", album: "Single", duration: "3:24" },
    { id: "im-2", title: "Catch Me", album: "Single", duration: "3:11" },
  ],
  "JUSTIZ": [
    { id: "jz-1", title: "Lights Out", album: "Single", duration: "3:42" },
    { id: "jz-2", title: "Northbound", album: "Single", duration: "4:01" },
  ],
  "KETTAMA": [
    { id: "kt-1", title: "Goodbye", album: "Single", duration: "5:54" },
    { id: "kt-2", title: "Vanilla", album: "Single", duration: "6:22" },
    { id: "kt-3", title: "Up Yours", album: "Single", duration: "5:48" },
  ],
  "ZINGARA": [
    { id: "zg-1", title: "Astral", album: "Single", duration: "5:14" },
    { id: "zg-2", title: "Wanderer", album: "Single", duration: "4:47" },
  ],
  "DIRTWAVE": [
    { id: "dw-1", title: "Foundation", album: "Single", duration: "4:32" },
    { id: "dw-2", title: "Loam", album: "Single", duration: "5:18" },
  ],
  "EFIN": [
    { id: "ef-1", title: "Distortion", album: "Single", duration: "3:48" },
  ],
  "IVY LAB": [
    { id: "iv-1", title: "Sunday Crunk", album: "Wolves", duration: "3:48" },
    { id: "iv-2", title: "Oblique", album: "Death Don't Always Taste Good", duration: "4:14" },
    { id: "iv-3", title: "Brick Drop", album: "Single", duration: "3:32" },
  ],
  "KALEBRA SANDERS": [
    { id: "ks-1", title: "Honey", album: "Single", duration: "3:44" },
    { id: "ks-2", title: "Heatwave", album: "Single", duration: "4:02" },
  ],
  "MYAGO": [
    { id: "my-1", title: "Northeast", album: "Single", duration: "4:11" },
  ],
  "NEOSHAMAN": [
    { id: "ns-1", title: "Forest Spirit", album: "Single", duration: "7:14" },
    { id: "ns-2", title: "Trance State", album: "Single", duration: "8:02" },
  ],
  "LANGLIE": [
    { id: "lg-1", title: "Slow Burn", album: "Single", duration: "4:24" },
  ],
  "PASHENOVA": [
    { id: "ps-1", title: "Dreamline", album: "Single", duration: "3:58" },
  ],
  "A-TRAK": [
    { id: "at-1", title: "Heads Will Roll (A-Trak Remix)", album: "Single", duration: "5:02" },
    { id: "at-2", title: "Push", album: "Single", duration: "3:11" },
    { id: "at-3", title: "Ride For Me", album: "Single", duration: "3:24" },
  ],
  "AYRO": [
    { id: "ay-1", title: "Drop", album: "Single", duration: "3:44" },
  ],
  "CLOONEE": [
    { id: "cn-1", title: "Be Somebody", album: "Single", duration: "3:14" },
    { id: "cn-2", title: "Flute", album: "Single", duration: "3:32" },
    { id: "cn-3", title: "Mama Africa", album: "Single", duration: "3:48" },
  ],
  "CLOZEE": [
    { id: "cz-1", title: "Koto", album: "Microworlds", duration: "4:24" },
    { id: "cz-2", title: "Mira", album: "Neon Jungle", duration: "4:11" },
    { id: "cz-3", title: "Forest Spirits", album: "Microworlds", duration: "5:02" },
  ],
  "HEDEX": [
    { id: "hd-1", title: "Resurrection", album: "Single", duration: "3:48" },
    { id: "hd-2", title: "Power", album: "Single", duration: "3:22" },
  ],
  "HOLI": [
    { id: "ho-1", title: "Riddim Master", album: "Single", duration: "3:14" },
  ],
  "LEVEL UP": [
    { id: "lu-1", title: "BOOM", album: "Single", duration: "3:24" },
    { id: "lu-2", title: "Like This", album: "Single", duration: "3:01" },
  ],
  "LOUIS THE CHILD": [
    { id: "lc-1", title: "Better Not", album: "Kids at Play", duration: "3:24" },
    { id: "lc-2", title: "Save Me From Myself", album: "Single", duration: "3:32" },
    { id: "lc-3", title: "Slow Down Love", album: "Here For Now", duration: "3:11" },
    { id: "lc-4", title: "Free", album: "Single", duration: "3:48" },
  ],
  "TYLAN": [
    { id: "ty-1", title: "Outline", album: "Single", duration: "4:02" },
  ],
  "VAMPIRES AT THE TREES": [
    { id: "vat-1", title: "Bite", album: "Single", duration: "3:48" },
  ],
  "RAY VOLPE": [
    { id: "rv-1", title: "Laserbeam", album: "Single", duration: "3:14" },
    { id: "rv-2", title: "Bad Boy", album: "Single", duration: "3:24" },
    { id: "rv-3", title: "Just Wanna Rave", album: "Single", duration: "3:01" },
  ],
  "SUBTRONICS": [
    { id: "sb-1", title: "Griztronics", album: "Single", duration: "3:48" },
    { id: "sb-2", title: "Antidote", album: "Fractals", duration: "3:32" },
    { id: "sb-3", title: "Vibe Decoder", album: "Fractals", duration: "3:24" },
  ],
  "SVDDEN DEATH": [
    { id: "sd-1", title: "Behemoth", album: "Single", duration: "3:42" },
    { id: "sd-2", title: "Apocalypse", album: "Single", duration: "3:24" },
  ],
  "WESTEND": [
    { id: "we-1", title: "Drop A Hint", album: "Single", duration: "3:14" },
    { id: "we-2", title: "Robotech", album: "Single", duration: "3:32" },
  ],
  "BROLIN": [
    { id: "br-1", title: "Long Way Home", album: "Single", duration: "3:48" },
  ],
  "PRIYA RAGU": [
    { id: "pr-1", title: "Chicken Lemon Rice", album: "Single", duration: "3:24" },
    { id: "pr-2", title: "Good Love 2.0", album: "damnshestamil", duration: "3:11" },
    { id: "pr-3", title: "Lockdown", album: "damnshestamil", duration: "3:01" },
  ],
  "STEFF DA CAMPO": [
    { id: "sc-1", title: "On My Own", album: "Single", duration: "3:14" },
  ],
  "BOBBY LIMA": [
    { id: "bl-1", title: "Move Your Body", album: "Single", duration: "3:24" },
  ],
  "SIPPY": [
    { id: "si-1", title: "Wormhole", album: "Single", duration: "3:48" },
    { id: "si-2", title: "Take It Back", album: "Single", duration: "3:11" },
  ],
  "HANA": [
    { id: "hn-1", title: "Clay", album: "Single", duration: "3:48" },
    { id: "hn-2", title: "Underwater", album: "Single", duration: "3:24" },
  ],
  "MARC HERZ": [
    { id: "mh-1", title: "Pulse", album: "Single", duration: "4:02" },
  ],
  "PATCHY": [
    { id: "pa-1", title: "Stitch", album: "Single", duration: "3:48" },
  ],
  "PAUL PARSONS": [
    { id: "pp-1", title: "Reverberate", album: "Single", duration: "5:11" },
  ],
  "TAYLOR PARK": [
    { id: "tp-1", title: "Treeline", album: "Single", duration: "4:02" },
  ],
  "ACRAZE": [
    { id: "ac-1", title: "Do It To It", album: "Single", duration: "2:35" },
    { id: "ac-2", title: "Believe", album: "Single", duration: "3:04" },
    { id: "ac-3", title: "Take Me Back", album: "Single", duration: "3:12" },
  ],
  "CHARLOTTE DE WITTE": [
    { id: "cdw-1", title: "Doppler", album: "Doppler EP", duration: "6:14" },
    { id: "cdw-2", title: "Sgadan", album: "Asura EP", duration: "6:48" },
    { id: "cdw-3", title: "Liquid Slow", album: "Liquid Slow EP", duration: "5:32" },
  ],
  "I HATE MODELS": [
    { id: "ihm-1", title: "Daydream", album: "Daydream EP", duration: "5:48" },
    { id: "ihm-2", title: "Tongue Tied", album: "L'Age des Métamorphoses", duration: "5:12" },
  ],
  "GOLDEN PONY": [
    { id: "gp-1", title: "Stay With Me Tonight", album: "Single", duration: "3:48" },
  ],
  "PORTER ROBINSON": [
    { id: "pr-r1", title: "Cheerleader", album: "SMILE :D", duration: "2:51" },
    { id: "pr-r2", title: "Knock Yourself Out XD", album: "SMILE :D", duration: "3:11" },
    { id: "pr-r3", title: "Shelter", album: "Single (with Madeon)", duration: "3:38" },
    { id: "pr-r4", title: "Look at the Sky", album: "Nurture", duration: "4:21" },
    { id: "pr-r5", title: "Mirror", album: "Nurture", duration: "4:13" },
  ],
  "SNOW GOOD": [
    { id: "sg-1", title: "Drift", album: "Single", duration: "3:24" },
  ],
  "JACKIE HOLLANDER": [
    { id: "jh-1", title: "Velvet Hour", album: "Single", duration: "4:11" },
  ],
};

// Build artist list from CSV-shaped data baked in (so we don't need a fetch).
const LINEUP = [
  // Friday
  { day: "Friday",   artist: "ABOVE & BEYOND",    genre: "Trance" },
  { day: "Friday",   artist: "ATB",               genre: "Trance" },
  { day: "Friday",   artist: "CHRIS LAKE",        genre: "Tech House" },
  { day: "Friday",   artist: "CRANKDAT",          genre: "Dubstep" },
  { day: "Friday",   artist: "EXCISION",          genre: "Dubstep" },
  { day: "Friday",   artist: "GANJA WHITE NIGHT", genre: "Melodic Dubstep" },
  { day: "Friday",   artist: "IT'S MURPH",        genre: "Bass House" },
  { day: "Friday",   artist: "JUSTIZ",            genre: "Electronic" },
  { day: "Friday",   artist: "KETTAMA",           genre: "Tech House" },
  { day: "Friday",   artist: "ZINGARA",           genre: "Astral Bass" },
  { day: "Friday",   artist: "DIRTWAVE",          genre: "Electro-Acoustic" },
  { day: "Friday",   artist: "EFIN",              genre: "Dubstep" },
  { day: "Friday",   artist: "IVY LAB",           genre: "Halftime D&B" },
  { day: "Friday",   artist: "KALEBRA SANDERS",   genre: "Vocal House" },
  { day: "Friday",   artist: "MYAGO",             genre: "Electronic" },
  { day: "Friday",   artist: "NEOSHAMAN",         genre: "Psytrance" },
  { day: "Friday",   artist: "LANGLIE",           genre: "Electronic" },
  { day: "Friday",   artist: "PASHENOVA",         genre: "Electronic" },
  // Saturday
  { day: "Saturday", artist: "A-TRAK",            genre: "Open Format" },
  { day: "Saturday", artist: "AYRO",              genre: "Tech House" },
  { day: "Saturday", artist: "CLOONEE",           genre: "Tech House" },
  { day: "Saturday", artist: "CLOZEE",            genre: "World Bass" },
  { day: "Saturday", artist: "HEDEX",             genre: "Drum & Bass" },
  { day: "Saturday", artist: "HOLI",              genre: "Riddim" },
  { day: "Saturday", artist: "LEVEL UP",          genre: "Dubstep" },
  { day: "Saturday", artist: "LOUIS THE CHILD",   genre: "Future Bass" },
  { day: "Saturday", artist: "TYLAN",             genre: "Electronic" },
  { day: "Saturday", artist: "VAMPIRES AT THE TREES", genre: "Electronic" },
  { day: "Saturday", artist: "RAY VOLPE",         genre: "Melodic Bass" },
  { day: "Saturday", artist: "SUBTRONICS",        genre: "Riddim" },
  { day: "Saturday", artist: "SVDDEN DEATH",      genre: "Riddim" },
  { day: "Saturday", artist: "WESTEND",           genre: "Tech House" },
  { day: "Saturday", artist: "BROLIN",            genre: "Electronic" },
  { day: "Saturday", artist: "PRIYA RAGU",        genre: "R&B / Soul" },
  { day: "Saturday", artist: "STEFF DA CAMPO",    genre: "Bass House" },
  { day: "Saturday", artist: "BOBBY LIMA",        genre: "Tech House" },
  { day: "Saturday", artist: "SIPPY",             genre: "Heavy Bass" },
  { day: "Saturday", artist: "HANA",              genre: "Synth Pop" },
  { day: "Saturday", artist: "MARC HERZ",         genre: "Drum & Bass" },
  { day: "Saturday", artist: "PATCHY",            genre: "Electronic" },
  { day: "Saturday", artist: "PAUL PARSONS",      genre: "House" },
  { day: "Saturday", artist: "TAYLOR PARK",       genre: "Electronic" },
  // Sunday
  { day: "Sunday",   artist: "ACRAZE",            genre: "Tech House" },
  { day: "Sunday",   artist: "CHARLOTTE DE WITTE",genre: "Techno" },
  { day: "Sunday",   artist: "I HATE MODELS",     genre: "Techno" },
  { day: "Sunday",   artist: "GOLDEN PONY",       genre: "House" },
  { day: "Sunday",   artist: "PORTER ROBINSON",   genre: "Melodic Electronic" },
  { day: "Sunday",   artist: "SNOW GOOD",         genre: "Hip-Hop" },
  { day: "Sunday",   artist: "JACKIE HOLLANDER",  genre: "Electronic" },
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
