/**
 * Words and phrases a devotion comment may not contain.
 * Matching is case-insensitive, on whole words, including the obfuscations
 * the filter understands.
 *
 * biblical names: allowed
 * Names of the God of the Bible, and false-god or idol names that appear in
 * the NKJV, are listed below and must not be added to these blocklists.
 */
export const commentBlocklist = {
  profanity: [
    "ass",
    "asshole",
    "bastard",
    "bitch",
    "bullshit",
    "cock",
    "crap",
    "cunt",
    "damn",
    "dick",
    "fag",
    "faggot",
    "fuck",
    "goddamn",
    "motherfucker",
    "nigga",
    "nigger",
    "piss",
    "porn",
    "pussy",
    "shit",
    "slut",
    "whore",
  ],
  threats: [
    "assault",
    "beat you",
    "bomb",
    "hurt you",
    "kill",
    "kill yourself",
    "murder",
    "rape",
    "shoot",
    "stab",
    "strangle",
  ],
  otherGods: [
    "allah",
    "anubis",
    "apollo",
    "athena",
    "brahma",
    "buddha",
    "durga",
    "ganesh",
    "ganesha",
    "hades",
    "horus",
    "isis",
    "juno",
    "jupiter",
    "kali",
    "krishna",
    "loki",
    "odin",
    "osiris",
    "poseidon",
    "quetzalcoatl",
    "ra",
    "shiva",
    "thor",
    "vishnu",
  ],
} as const;

/**
 * biblical names: allowed
 * The God of the Bible, plus false gods and idols named in the NKJV.
 * Do not add these to commentBlocklist.
 */
export const biblicalNames = [
  "god",
  "lord",
  "jesus",
  "christ",
  "holy spirit",
  "yahweh",
  "jehovah",
  "messiah",
  "father",
  "savior",
  "saviour",
  "spirit",
  "amen",
  "hallelujah",
] as const;

/** biblical names: allowed. Idol names that appear in the NKJV. */
export const biblicalIdolNames = [
  "baal",
  "baal-zebub",
  "baal-peor",
  "baals",
  "molech",
  "milcom",
  "moloch",
  "dagon",
  "ashtoreth",
  "ashtoreths",
  "asherah",
  "wooden images",
  "chemosh",
  "tammuz",
  "rimmon",
  "nebo",
  "bel",
  "merodach",
  "nergal",
  "nisroch",
  "diana",
  "zeus",
  "hermes",
  "remphan",
  "artemis",
] as const;

export type CommentBlockCategory = keyof typeof commentBlocklist;
