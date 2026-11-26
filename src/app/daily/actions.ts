"use server";

import { loadCatalog } from "@/lib/content/load";
import {
  gradeDailyChoice,
  resolveDailyQuestion,
  toDailyAsk,
  type DailyAsk,
  type DailyGradeResult,
} from "@/lib/game/daily-challenge";
import { AGE_GROUPS, type AgeGroup, type GameProgress } from "@/lib/game/types";

export type DailyOpenResponse = { status: "ready"; ask: DailyAsk } | { status: "none" };

/** Serves today's question from stages this progress has reached. No answer id is returned. */
export async function openDailyChallengeAction(
  progress: GameProgress,
  dayKey: string,
  ageGroup: AgeGroup,
): Promise<DailyOpenResponse> {
  if (!AGE_GROUPS.includes(ageGroup)) return { status: "none" };
  const question = resolveDailyQuestion(loadCatalog().questions, progress, dayKey);
  if (!question) return { status: "none" };
  return { status: "ready", ask: toDailyAsk(question, ageGroup) };
}

/**
 * Grades the question this progress would be served today.
 * A different question id is refused. The result is right-or-not and verse references.
 */
export async function gradeDailyChallengeAction(
  progress: GameProgress,
  dayKey: string,
  questionId: string,
  choiceId: string,
): Promise<DailyGradeResult | null> {
  if (typeof questionId !== "string" || typeof choiceId !== "string") return null;
  const question = resolveDailyQuestion(loadCatalog().questions, progress, dayKey);
  if (!question || question.id !== questionId) return null;
  if (!question.choices.some((choice) => choice.id === choiceId)) return null;
  return gradeDailyChoice(question, choiceId);
}
