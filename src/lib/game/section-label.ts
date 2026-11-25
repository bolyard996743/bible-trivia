/** A cited verse the stored section label does not already name. */
export function citedSectionLabel(question: {
  section: string;
  teaching: { verses: { ref: string }[] };
}): string {
  const labels: string[] = [];
  for (const verse of question.teaching.verses) {
    const match = /^(.+?)\s+(\d+)(?::|$)/.exec(verse.ref.trim());
    if (!match) continue;
    const label = `${match[1]} ${match[2]}`;
    if (!labels.includes(label)) labels.push(label);
  }
  if (labels.length === 0) return question.section;
  if (labels.every((label) => question.section.includes(label))) return question.section;
  if (labels.length === 1) return labels[0] ?? question.section;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(", ")}, and ${last}`;
}
