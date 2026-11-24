import { biblicalNames, commentBlocklist, type CommentBlockCategory } from "../../../config/comment-blocklist";

export const COMMENT_MAX_LENGTH = 280;

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

const MESSAGES: Record<CommentBlockCategory | "contact" | "length", string> = {
  profanity: "Please take out words that don't belong in this conversation.",
  threats: "Please rephrase that without violent words.",
  otherGods: "Please keep this comment with the God of the Bible.",
  contact: "Please take out links, email addresses, and phone numbers.",
  length: "Please keep the comment to 280 characters.",
};

export type CommentReview =
  | { ok: true; body: string }
  | { ok: false; category: CommentBlockCategory | "contact" | "length"; message: string };

function lightNormalize(raw: string): string {
  let out = "";
  for (const char of raw.toLowerCase()) out += LEET[char] ?? char;
  return out.replace(/[^a-z]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Joins spaced letters such as "c u n t" and leaves ordinary words alone. */
export function joinSingleLetters(text: string): string {
  const tokens = text.split(" ").filter(Boolean);
  const out: string[] = [];
  let buf = "";
  const flush = () => {
    if (!buf) return;
    if (buf.length >= 3) out.push(buf);
    else out.push(...buf.split(""));
    buf = "";
  };
  for (const token of tokens) {
    if (token.length === 1) buf += token;
    else {
      flush();
      out.push(token);
    }
  }
  flush();
  return out.join(" ");
}

function collapseRuns(word: string): string {
  return word.replace(/([a-z])\1{2,}/g, "$1");
}

/** "ass" -> a+s{2,}; "fuck" -> f+u+c+k+ so repeated letters still match. */
export function termPattern(term: string): string {
  let out = "";
  let index = 0;
  while (index < term.length) {
    const char = term[index] ?? "";
    let count = 1;
    while (term[index + count] === char) count += 1;
    out += count >= 2 ? `${char}{${count},}` : `${char}+`;
    index += count;
  }
  return out;
}

function termMatches(form: string, term: string): boolean {
  if (term.includes(" ")) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(form);
  }
  const pattern = new RegExp(`^(?:${termPattern(term)})$`, "i");
  return form.split(" ").some((word) => {
    if (!word) return false;
    return pattern.test(word) || pattern.test(collapseRuns(word));
  });
}

function hasContact(raw: string): boolean {
  if (/https?:\/\//i.test(raw) || /www\./i.test(raw)) return true;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return true;
  if (/\b[a-z0-9-]+\.(com|net|org|io|co|app|gg|me)\b/i.test(raw)) return true;
  if (/\d{7,}/.test(raw)) return true;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10;
}

export function reviewComment(input: string): CommentReview {
  const body = input.trim();
  if (!body) return { ok: false, category: "length", message: "Write a comment first." };
  if ([...body].length > COMMENT_MAX_LENGTH) {
    return { ok: false, category: "length", message: MESSAGES.length };
  }
  if (hasContact(body)) return { ok: false, category: "contact", message: MESSAGES.contact };
  const forms = [lightNormalize(body), joinSingleLetters(lightNormalize(body))];
  for (const category of ["profanity", "threats", "otherGods"] as const) {
    for (const term of commentBlocklist[category]) {
      if (forms.some((form) => termMatches(form, term))) {
        return { ok: false, category, message: MESSAGES[category] };
      }
    }
  }
  return { ok: true, body };
}

export function biblicalNamesAreUnblocked(): string[] {
  return biblicalNames.filter((name) => !reviewComment(name).ok);
}
