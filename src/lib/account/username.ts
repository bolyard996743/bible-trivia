/** Words that cannot appear in a public username. */
export const BLOCKED_USERNAME_PARTS = [
  "admin",
  "asshole",
  "bitch",
  "cock",
  "cunt",
  "dick",
  "faggot",
  "fuck",
  "moderator",
  "nazi",
  "nigga",
  "nigger",
  "porn",
  "pussy",
  "shit",
  "slut",
  "support",
] as const;

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export type UsernameResult = { ok: true; username: string } | { ok: false; reason: string };

export function validateUsername(raw: string): UsernameResult {
  const username = raw.trim();
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, reason: "Use 3 to 20 letters, numbers, or underscores." };
  }
  if (username.includes("@")) {
    return { ok: false, reason: "Don't put an email address in a username." };
  }
  if (/https?:\/\/|www\./i.test(username)) {
    return { ok: false, reason: "Don't put a web address in a username." };
  }
  const digits = username.replace(/\D/g, "");
  if (digits.length >= 7) {
    return { ok: false, reason: "Don't put a phone number in a username." };
  }
  const lowered = username.toLowerCase();
  if (BLOCKED_USERNAME_PARTS.some((part) => lowered.includes(part))) {
    return { ok: false, reason: "Choose a different username." };
  }
  return { ok: true, username };
}
