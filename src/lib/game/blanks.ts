/**
 * Fill-in markers that appear in question prompts.
 * Content uses three underscores, and three dots when a quotation is left open.
 * An ellipsis that closes a question ("...?") is punctuation, not a gap.
 */
const BLANK_MARKER =
  /_{3,}|\{\s*blank\s*\}|\[\s*blank\s*\]|…(?!\?)|(?<!\.)\.{3}(?!\.)(?!\?)/gi;

const TRAILING_PUNCTUATION = /^[.,;:!?…"“”‘’"'»)\]-]+/u;

export type PromptPiece =
  | { kind: "text"; text: string }
  | { kind: "blank"; trailing: string };

export function splitPromptBlanks(text: string): PromptPiece[] {
  const pattern = new RegExp(BLANK_MARKER.source, BLANK_MARKER.flags);
  const rough: Array<{ kind: "text"; text: string } | { kind: "blank" }> = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) rough.push({ kind: "text", text: text.slice(last, index) });
    rough.push({ kind: "blank" });
    last = index + match[0].length;
  }
  if (last < text.length) rough.push({ kind: "text", text: text.slice(last) });
  if (rough.length === 0) return [{ kind: "text", text }];

  const pieces: PromptPiece[] = [];
  for (let index = 0; index < rough.length; index += 1) {
    const part = rough[index];
    if (!part || part.kind === "blank") {
      let trailing = "";
      const next = rough[index + 1];
      if (next?.kind === "text") {
        const punct = next.text.match(TRAILING_PUNCTUATION);
        if (punct?.[0]) {
          trailing = punct[0];
          next.text = next.text.slice(trailing.length);
        }
      }
      pieces.push({ kind: "blank", trailing });
      continue;
    }
    if (part.text.length > 0) pieces.push(part);
  }
  return pieces.length > 0 ? pieces : [{ kind: "text", text: "" }];
}
