/**
 * Topic and slug lookup for badge emblems.
 * Unknown topics use one fallback so a new badge still has a ring and an icon.
 * Icons and palettes are original to this app.
 */

export const BADGE_ICON_IDS = [
  "creation",
  "ark",
  "lion",
  "dove",
  "cross",
  "scroll",
  "letter",
  "wall",
  "crown",
  "shepherd",
  "fish",
  "bread",
  "lamp",
  "staff",
  "sling",
  "star",
  "heart",
  "flame",
  "mountain",
  "tree",
  "shield",
  "wheat",
  "people",
  "door",
  "road",
  "key",
  "trumpet",
  "tablets",
  "ship",
  "jar",
  "tent",
  "coat",
  "cup",
  "temple",
  "bird",
  "anchor",
  "sunrise",
  "vine",
  "rainbow",
  "ladder",
  "storm",
  "hands",
  "well",
  "city",
  "chain",
  "scales",
  "coin",
  "ring",
  "wheel",
  "hourglass",
  "banner",
  "tools",
  "bones",
  "drop",
  "locust",
  "horse",
  "harp",
] as const;

export type BadgeIconId = (typeof BADGE_ICON_IDS)[number];

export const PALETTE_IDS = [
  "sunrise",
  "flood",
  "lion",
  "dove",
  "cross",
  "scroll",
  "wall",
  "crown",
  "meadow",
  "sea",
  "bread",
  "lamp",
  "night",
  "heart",
  "flame",
  "mountain",
  "tree",
  "shield",
  "wheat",
  "clay",
  "door",
  "key",
  "trumpet",
  "stone",
  "ship",
  "rose",
  "tent",
  "amber",
  "vine",
  "rainbow",
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export type BadgePalette = {
  id: PaletteId;
  ringFrom: string;
  ringTo: string;
  inner: string;
  ink: string;
  wash: string;
  accent: string;
};

export const FALLBACK_ICON: BadgeIconId = "scroll";
export const FALLBACK_PALETTE_ID: PaletteId = "amber";

export const PALETTES: Record<PaletteId, BadgePalette> = {
  sunrise: palette("sunrise", "#e36a22", "#f2c14e", "#fff3d4", "#8a3b12", "#f6c56a", "#fff4c2"),
  flood: palette("flood", "#2b74d6", "#67c6d4", "#e7f6fb", "#143e78", "#8ec8e4", "#d4f3fb"),
  lion: palette("lion", "#e07a14", "#f0b429", "#fff1d2", "#7a3c0c", "#f0c078", "#ffe7a8"),
  dove: palette("dove", "#2f95b8", "#8ed0c2", "#eef8f6", "#1a5568", "#b7e0d6", "#f4fffb"),
  cross: palette("cross", "#c4374a", "#e8a24a", "#fff0e8", "#8a2432", "#f3c0b0", "#ffe1b0"),
  scroll: palette("scroll", "#c9892c", "#e8c47a", "#fff6e6", "#6a4814", "#f0d7a4", "#fff1cc"),
  wall: palette("wall", "#c4622e", "#e3a06a", "#fff1e6", "#6e381e", "#e8b898", "#ffe6d4"),
  crown: palette("crown", "#d4a017", "#f2d56b", "#fff8df", "#7a5810", "#f3dd8a", "#fff3c0"),
  meadow: palette("meadow", "#2f8a48", "#8bc56a", "#eef8e8", "#1c5a30", "#b7d9a4", "#e4f6c8"),
  sea: palette("sea", "#1b7594", "#4eb6c8", "#e6f6f8", "#0e4a60", "#9ed4e0", "#d8f4f8"),
  bread: palette("bread", "#d08632", "#f0c078", "#fff5e6", "#7a4814", "#f0d0a0", "#ffe6c0"),
  lamp: palette("lamp", "#e0a018", "#f6d56a", "#fff8e0", "#8a5808", "#f6d98a", "#fff4c4"),
  night: palette("night", "#3a4e9a", "#7a6ad4", "#eef0fb", "#2a3278", "#c5c8ee", "#f6f4ff"),
  heart: palette("heart", "#d14b78", "#f0a0b8", "#fff0f4", "#8c2248", "#f4c0cc", "#ffe0ea"),
  flame: palette("flame", "#e2521c", "#f0a03a", "#fff1e4", "#8a2c10", "#f6c08a", "#ffe0b8"),
  mountain: palette("mountain", "#3b7a68", "#8fb89a", "#eef6f1", "#1c4e42", "#b7d4c4", "#e4f4ea"),
  tree: palette("tree", "#2c8644", "#6fbf62", "#eef8ee", "#184e2c", "#b5ddb0", "#dff6c8"),
  shield: palette("shield", "#3a68a8", "#7aa0d4", "#eef3fb", "#1e3c6e", "#c5d6ee", "#e4eeff"),
  wheat: palette("wheat", "#c4a02c", "#e6d078", "#fff8e4", "#6e5210", "#f0e0a8", "#fff2c8"),
  clay: palette("clay", "#c46242", "#e8a888", "#fff2ea", "#6e3220", "#f0c4b0", "#ffe4d4"),
  door: palette("door", "#8a5a32", "#c49464", "#fbf3ea", "#5c3818", "#e2c4a4", "#f6e6d0"),
  key: palette("key", "#b8860b", "#e6c35c", "#fff8e4", "#6e5008", "#f0d98a", "#fff0c0"),
  trumpet: palette("trumpet", "#c45428", "#e8a060", "#fff3ea", "#7a3012", "#f0c4a0", "#ffe0c4"),
  stone: palette("stone", "#4a6898", "#8aa4c8", "#f0f4fa", "#243c64", "#c5d4e8", "#e6eef8"),
  ship: palette("ship", "#1c6c88", "#5aafc4", "#e7f5f8", "#0e4254", "#a8d4e0", "#d8f2f6"),
  rose: palette("rose", "#a85268", "#d4989a", "#fbf0f2", "#6e2c3a", "#e8c0c4", "#ffe4e8"),
  tent: palette("tent", "#8a6838", "#c4a468", "#fbf6ea", "#5c4016", "#e6d2a4", "#f6ead0"),
  amber: palette("amber", "#d0892a", "#f0c36a", "#fff6e2", "#6e4610", "#f2d39a", "#ffe8bc"),
  vine: palette("vine", "#3a8a38", "#7eb85a", "#f0f8e8", "#24581c", "#c4dea8", "#e6f6c8"),
  rainbow: palette("rainbow", "#d45a8a", "#f0b84a", "#fff4f0", "#6e2858", "#f0c4d4", "#ffe6a8"),
};

const TOPIC_LOOK: Record<string, { icon: BadgeIconId; palette: PaletteId }> = {
  creation: { icon: "creation", palette: "sunrise" },
  noah: { icon: "ark", palette: "flood" },
  ark: { icon: "ark", palette: "flood" },
  moses: { icon: "staff", palette: "stone" },
  "david-goliath": { icon: "sling", palette: "clay" },
  jonah: { icon: "fish", palette: "sea" },
  fish: { icon: "fish", palette: "sea" },
  "jesus-birth": { icon: "star", palette: "night" },
  miracles: { icon: "bread", palette: "bread" },
  bread: { icon: "bread", palette: "bread" },
  "cross-resurrection": { icon: "cross", palette: "cross" },
  cross: { icon: "cross", palette: "cross" },
  "john-3-16-17": { icon: "heart", palette: "heart" },
  "greatest-commandment": { icon: "heart", palette: "heart" },
  heart: { icon: "heart", palette: "heart" },
  dove: { icon: "dove", palette: "dove" },
  net: { icon: "fish", palette: "sea" },
  sheep: { icon: "shepherd", palette: "meadow" },
  shepherd: { icon: "shepherd", palette: "meadow" },
  lamb: { icon: "shepherd", palette: "meadow" },
  "jesus-identity": { icon: "shepherd", palette: "meadow" },
  mountain: { icon: "mountain", palette: "mountain" },
  mountains: { icon: "mountain", palette: "mountain" },
  tree: { icon: "tree", palette: "tree" },
  scroll: { icon: "scroll", palette: "scroll" },
  letter: { icon: "letter", palette: "stone" },
  writing: { icon: "scroll", palette: "scroll" },
  blueprint: { icon: "scroll", palette: "stone" },
  "wisdom-books": { icon: "lamp", palette: "lamp" },
  cup: { icon: "cup", palette: "rose" },
  pentecost: { icon: "flame", palette: "flame" },
  door: { icon: "door", palette: "door" },
  doors: { icon: "door", palette: "door" },
  road: { icon: "road", palette: "clay" },
  "roman-road": { icon: "road", palette: "clay" },
  "great-commission": { icon: "road", palette: "sunrise" },
  key: { icon: "key", palette: "key" },
  "armor-of-god": { icon: "shield", palette: "shield" },
  shield: { icon: "shield", palette: "shield" },
  breastplate: { icon: "shield", palette: "shield" },
  lamp: { icon: "lamp", palette: "lamp" },
  "psalm-23": { icon: "shepherd", palette: "meadow" },
  "psalm-1": { icon: "tree", palette: "tree" },
  owl: { icon: "bird", palette: "night" },
  daniel: { icon: "lion", palette: "lion" },
  lion: { icon: "lion", palette: "lion" },
  apple: { icon: "tree", palette: "tree" },
  tent: { icon: "tent", palette: "tent" },
  joseph: { icon: "coat", palette: "rainbow" },
  trumpet: { icon: "trumpet", palette: "trumpet" },
  revelation: { icon: "trumpet", palette: "trumpet" },
  jar: { icon: "jar", palette: "rose" },
  pillars: { icon: "temple", palette: "stone" },
  ruth: { icon: "wheat", palette: "wheat" },
  crown: { icon: "crown", palette: "crown" },
  scepter: { icon: "crown", palette: "crown" },
  throne: { icon: "crown", palette: "crown" },
  temple: { icon: "temple", palette: "stone" },
  raven: { icon: "bird", palette: "night" },
  bird: { icon: "bird", palette: "dove" },
  wave: { icon: "ship", palette: "flood" },
  people: { icon: "people", palette: "clay" },
  "early-church": { icon: "people", palette: "flame" },
  "twelve-disciples": { icon: "people", palette: "sea" },
  "fruit-of-spirit": { icon: "tree", palette: "vine" },
  hands: { icon: "hands", palette: "clay" },
  "lords-prayer": { icon: "hands", palette: "sunrise" },
  tower: { icon: "wall", palette: "wall" },
  ladder: { icon: "ladder", palette: "tent" },
  goats: { icon: "shepherd", palette: "meadow" },
  grapes: { icon: "vine", palette: "vine" },
  cloak: { icon: "coat", palette: "shield" },
  robe: { icon: "coat", palette: "shield" },
  storm: { icon: "storm", palette: "flood" },
  cloud: { icon: "storm", palette: "shield" },
  wind: { icon: "storm", palette: "dove" },
  coal: { icon: "flame", palette: "flame" },
  "isaiah-53-6": { icon: "cross", palette: "cross" },
  seed: { icon: "tree", palette: "meadow" },
  palm: { icon: "tree", palette: "tree" },
  olive: { icon: "tree", palette: "vine" },
  footprints: { icon: "road", palette: "clay" },
  sandals: { icon: "road", palette: "tent" },
  ship: { icon: "ship", palette: "ship" },
  lampstand: { icon: "lamp", palette: "lamp" },
  candle: { icon: "lamp", palette: "lamp" },
  censer: { icon: "lamp", palette: "flame" },
  city: { icon: "city", palette: "stone" },
  well: { icon: "well", palette: "sea" },
  calf: { icon: "shepherd", palette: "wheat" },
  stones: { icon: "sling", palette: "stone" },
  spear: { icon: "staff", palette: "stone" },
  cave: { icon: "wall", palette: "door" },
  bricks: { icon: "wall", palette: "wall" },
  wall: { icon: "wall", palette: "wall" },
  fortress: { icon: "wall", palette: "wall" },
  hyssop: { icon: "vine", palette: "vine" },
  potter: { icon: "jar", palette: "clay" },
  bones: { icon: "bones", palette: "stone" },
  lilies: { icon: "vine", palette: "dove" },
  basin: { icon: "cup", palette: "sea" },
  ribbon: { icon: "banner", palette: "rose" },
  banner: { icon: "banner", palette: "cross" },
  banners: { icon: "banner", palette: "cross" },
  anchor: { icon: "anchor", palette: "ship" },
  chain: { icon: "chain", palette: "stone" },
  "ten-commandments": { icon: "tablets", palette: "stone" },
  tablets: { icon: "tablets", palette: "stone" },
  hourglass: { icon: "hourglass", palette: "wheat" },
  teardrop: { icon: "drop", palette: "sea" },
  ring: { icon: "ring", palette: "crown" },
  locust: { icon: "locust", palette: "vine" },
  scales: { icon: "scales", palette: "key" },
  hammer: { icon: "tools", palette: "wall" },
  tools: { icon: "tools", palette: "wall" },
  sunrise: { icon: "sunrise", palette: "sunrise" },
  vine: { icon: "vine", palette: "vine" },
  wheel: { icon: "wheel", palette: "clay" },
  beasts: { icon: "lion", palette: "lion" },
  coin: { icon: "coin", palette: "key" },
  rock: { icon: "mountain", palette: "mountain" },
  gate: { icon: "door", palette: "door" },
  rainbow: { icon: "rainbow", palette: "rainbow" },
  circles: { icon: "wheel", palette: "shield" },
  panels: { icon: "tablets", palette: "stone" },
  horse: { icon: "horse", palette: "lion" },
  beatitudes: { icon: "mountain", palette: "mountain" },
  epistles: { icon: "letter", palette: "stone" },
  psalms: { icon: "harp", palette: "lamp" },
  "fruitful-genesis-abraham-to-jacob-in-context": { icon: "tent", palette: "tent" },
  "fruitful-leviticus-holiness-sabbath-year-and-jubilee": { icon: "temple", palette: "stone" },
  "fruitful-numbers-complaints-and-rebellion": { icon: "tent", palette: "clay" },
  "fruitful-deuteronomy-moses-sermons": { icon: "tablets", palette: "stone" },
  "fruitful-1chr": { icon: "temple", palette: "stone" },
  "fruitful-1-chronicles-davids-kingdom-established": { icon: "crown", palette: "crown" },
  "fruitful-josiah": { icon: "scroll", palette: "scroll" },
  "fruitful-song-of-solomon": { icon: "heart", palette: "heart" },
  "fruitful-hosea-israels-unfaithfulness-and-return": { icon: "heart", palette: "rose" },
  "fruitful-amos-judgment-on-the-nations": { icon: "scales", palette: "key" },
  "fruitful-amos-justice-and-visions": { icon: "scales", palette: "wheat" },
  "fruitful-micah-where-is-a-god-like-you": { icon: "dove", palette: "dove" },
  "fruitful-zechariah-night-visions": { icon: "star", palette: "night" },
  "fruitful-zechariah-the-humble-king-and-the-pierced-one": { icon: "crown", palette: "crown" },
  "fruitful-joshua-dividing-the-land": { icon: "road", palette: "clay" },
  "fruitful-absaloms-rebellion": { icon: "crown", palette: "cross" },
  "fruitful-davids-mighty-men-and-the-census": { icon: "shield", palette: "shield" },
  "fruitful-solomons-decline-and-the-temple-dedication": { icon: "temple", palette: "crown" },
  "fruitful-jehu-athaliah-and-joash": { icon: "crown", palette: "crown" },
  "fruitful-isaiah-trust-in-the-lord-not-egypt": { icon: "shield", palette: "shield" },
  "fruitful-isaiah-oracles-against-the-nations": { icon: "trumpet", palette: "trumpet" },
  "fruitful-isaiah-the-servant-and-salvation": { icon: "cross", palette: "cross" },
  "fruitful-jeremiah-oracles-against-the-nations-and-baruch": { icon: "letter", palette: "stone" },
  "fruitful-psalms-wisdom-psalms": { icon: "harp", palette: "lamp" },
  "fruitful-psalms-hallel-and-the-songs-of-ascents": { icon: "harp", palette: "wheat" },
  "fruitful-proverbs-collected-sayings-and-agur": { icon: "lamp", palette: "lamp" },
  "fruitful-job-the-friends-and-elihu": { icon: "people", palette: "clay" },
  "fruitful-matthew": { icon: "star", palette: "night" },
  "fruitful-matthew-signs-readiness-and-judgment": { icon: "lamp", palette: "flame" },
  "fruitful-luke-the-road-to-jerusalem": { icon: "road", palette: "clay" },
  "fruitful-mark-teaching-and-conflict": { icon: "people", palette: "clay" },
  "fruitful-john-conflict-and-controversy": { icon: "lamp", palette: "lamp" },
  "fruitful-romans-1-4-sin-and-faith": { icon: "cross", palette: "cross" },
  "fruitful-romans-12-16-living-it-out": { icon: "people", palette: "meadow" },
  "fruitful-resurrection": { icon: "sunrise", palette: "sunrise" },
  "fruitful-2-corinthians-pauls-ministry-and-defense": { icon: "letter", palette: "stone" },
  "fruitful-hebrews-warnings-and-endurance": { icon: "anchor", palette: "ship" },
  "fruitful-seals": { icon: "trumpet", palette: "trumpet" },
  "fruitful-2peter": { icon: "lamp", palette: "lamp" },
  "fruitful-james-wealth-patience-and-prayer": { icon: "letter", palette: "stone" },
  "fruitful-1-peter-suffering-and-submission": { icon: "letter", palette: "stone" },
  "fruitful-1-john-test-the-spirits": { icon: "scroll", palette: "scroll" },
  "fruitful-ephesians-walk-worthy": { icon: "letter", palette: "stone" },
  "fruitful-jude": { icon: "scroll", palette: "scroll" },
};

export type BadgeLook = {
  icon: BadgeIconId;
  palette: BadgePalette;
  fallback: boolean;
};

const STAGE_PREFIX = /^(seed|sprout|rooted|growing|established|fruitful|deep-roots)-/;

function palette(
  id: PaletteId,
  ringFrom: string,
  ringTo: string,
  inner: string,
  ink: string,
  wash: string,
  accent: string,
): BadgePalette {
  return { id, ringFrom, ringTo, inner, ink, wash, accent };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function shiftHue(hex: string, degrees: number): string {
  const { h, s, l } = rgbToHsl(channel(hex, 0), channel(hex, 1), channel(hex, 2));
  return hslToHex(h + degrees, s, l);
}

/** Shared topics (especially scroll) shift within their family so neighbors are not clones. */
function varyPalette(base: BadgePalette, slug: string): BadgePalette {
  const hue = (hash(slug) % 46) - 23;
  return {
    ...base,
    ringFrom: shiftHue(base.ringFrom, hue),
    ringTo: shiftHue(base.ringTo, hue),
    accent: shiftHue(base.accent, hue),
  };
}

function mappedLook(topic: string, slug: string): { icon: BadgeIconId; palette: PaletteId } | undefined {
  if (slug && TOPIC_LOOK[slug]) return TOPIC_LOOK[slug];
  const suffix = slug.replace(STAGE_PREFIX, "");
  if (suffix && suffix !== slug && TOPIC_LOOK[suffix]) return TOPIC_LOOK[suffix];
  if (TOPIC_LOOK[topic]) return TOPIC_LOOK[topic];
  return undefined;
}

/**
 * Resolve a badge illustration.
 * `topic` is the path art key. `slug` is the badge id, used for a second lookup
 * and to vary palettes that many badges share.
 */
export function badgeLook(topic: string, slug = ""): BadgeLook {
  const mapped = mappedLook(topic, slug);
  if (!mapped) {
    return { icon: FALLBACK_ICON, palette: PALETTES[FALLBACK_PALETTE_ID], fallback: true };
  }
  const base = PALETTES[mapped.palette];
  const palette = slug ? varyPalette(base, slug) : base;
  return { icon: mapped.icon, palette, fallback: false };
}
