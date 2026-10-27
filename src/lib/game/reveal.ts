import type { Question } from "./types";

/** Case-insensitive check that `text` contains the choice wording. */
export function textContainsChoice(text: string, choiceText: string): boolean {
  const needle = choiceText.trim().toLowerCase();
  if (!needle) return false;
  return text.toLowerCase().includes(needle);
}

const REVEAL_PHRASES = [/correct answer/i, /the answer is/i];

export function explanationRevealIssues(question: Question): string[] {
  const correct = question.choices.find((choice) => choice.id === question.answer);
  if (!correct) return [`${question.id}: answer does not match a choice`];

  const fields: [string, string][] = [["explanation.adult", question.teaching.explanation.adult]];
  for (const age of ["child", "teen", "older"] as const) {
    const value = question.teaching.explanation[age];
    if (value) fields.push([`explanation.${age}`, value]);
  }
  if (question.teaching.extended_explanation) {
    fields.push(["extended_explanation", question.teaching.extended_explanation]);
  }

  const issues: string[] = [];
  for (const [label, text] of fields) {
    if (textContainsChoice(text, correct.text)) {
      issues.push(`${question.id}: ${label} contains the correct choice "${correct.text}"`);
    }
    for (const phrase of REVEAL_PHRASES) {
      if (phrase.test(text)) {
        issues.push(`${question.id}: ${label} states the answer outright`);
      }
    }
  }
  return issues;
}
