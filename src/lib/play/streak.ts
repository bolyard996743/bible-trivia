import type { AttemptPhase } from "@/lib/game/types";

/**
 * Correct answers in the open badge attempt.
 * A miss clears the count. The screen shows nothing at zero.
 */
export function badgeStreakDisplay(input: {
  correctIds: readonly string[];
  questionId: string;
  phase: AttemptPhase;
}): number {
  if (input.phase === "teaching") return 0;
  const saved = input.correctIds.length;
  if (input.phase === "mastered" && !input.correctIds.includes(input.questionId)) return saved + 1;
  return saved;
}

export function streakIsVisible(count: number): boolean {
  return count > 0;
}
