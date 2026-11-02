import type { Question } from "../game/types";

/** Drops bundled quotations before a question is sent to the browser. Display fetches the text. */
export function questionsForDisplay(questions: Question[]): Question[] {
  return questions.map((question) => ({
    ...question,
    teaching: {
      ...question.teaching,
      verses: question.teaching.verses.map((verse) => ({
        ref: verse.ref,
        translation: verse.translation,
        text: "",
      })),
    },
  }));
}
