import type { AttemptState } from "./types";

export function startAttempt(questionId: string): AttemptState {
  return { questionId, missCount: 0, phase: "asking" };
}

export function submitAnswer(state: AttemptState, correct: boolean): AttemptState {
  if (state.phase !== "asking") {
    throw new Error("An answer can only be submitted while the question is open.");
  }
  if (correct) {
    return { ...state, phase: "mastered" };
  }
  return { ...state, missCount: state.missCount + 1, phase: "teaching" };
}

export function acknowledgeTeaching(state: AttemptState): AttemptState {
  if (state.phase !== "teaching") {
    throw new Error("The question returns only after the teaching moment.");
  }
  return { ...state, phase: "asking" };
}

/** Longer help appears on the second miss and every miss after that. */
export function shouldShowExtended(missCount: number): boolean {
  return missCount >= 2;
}

/** The one-sentence takeaway is for a correct answer that followed a miss. */
export function shouldShowTakeaway(state: AttemptState): boolean {
  return state.phase === "mastered" && state.missCount > 0;
}

export function wasFirstAttempt(state: AttemptState): boolean {
  return state.phase === "mastered" && state.missCount === 0;
}
