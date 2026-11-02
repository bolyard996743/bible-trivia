import type { AttemptState, GameProgress } from "./types";

export function startAttempt(questionId: string): AttemptState {
  return { questionId, missCount: 0, phase: "asking" };
}

/** Continue an attempt after a reload. A different question starts over. */
export function resumeAttempt(questionId: string, saved: AttemptState | null | undefined): AttemptState {
  if (!saved || saved.questionId !== questionId) return startAttempt(questionId);
  if (saved.phase !== "asking" && saved.phase !== "teaching" && saved.phase !== "mastered") {
    return startAttempt(questionId);
  }
  const missCount = Number.isFinite(saved.missCount) ? Math.max(0, Math.floor(saved.missCount)) : 0;
  if (saved.phase === "asking" && missCount === 0) return startAttempt(questionId);
  return { questionId, missCount, phase: saved.phase };
}

/**
 * The on-screen attempt, including misses already stored for this question.
 * Mastered questions do not reopen.
 */
export function attemptForQuestion(questionId: string, progress: GameProgress): AttemptState {
  if (progress.openAttempt?.questionId === questionId) {
    return resumeAttempt(questionId, progress.openAttempt);
  }
  const misses = progress.missCounts?.[questionId] ?? 0;
  if (misses > 0 && !progress.masteredIds.includes(questionId)) {
    return { questionId, missCount: misses, phase: "asking" };
  }
  return startAttempt(questionId);
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
