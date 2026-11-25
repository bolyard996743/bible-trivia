/**
 * One apostrophe and a matching pair of quotes, applied when text is shown.
 * Content files stay as they are.
 */
export function matchTypography(text: string): string {
  let doubleOpen = true;
  let out = "";
  for (const char of text) {
    if (char === "'" || char === "\u2018" || char === "\u2019" || char === "\u201B") {
      out += "\u2019";
      continue;
    }
    if (char === '"' || char === "\u201C" || char === "\u201D") {
      out += doubleOpen ? "\u201C" : "\u201D";
      doubleOpen = !doubleOpen;
      continue;
    }
    out += char;
  }
  return out;
}
