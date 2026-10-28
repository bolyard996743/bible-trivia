import { knowledgeStage } from "./progression";
import type { PlacementAttempt, PlacementResult, Question, Tier } from "./types";
import { TIERS } from "./types";

/** Points per first-try correct answer. Harder tiers count more. */
export const TIER_WEIGHT: Record<Tier, number> = {
  foundation: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/**
 * Upper bounds are exclusive. A perfect score starts at Cycle 2, Advanced
 * (Deep Roots). Lower scores stay in earlier cycles so there is room to grow.
 */
export const PLACEMENT_BANDS: { maxRatio: number; cycle: number; tier: Tier }[] = [
  { maxRatio: 0.2, cycle: 1, tier: "foundation" },
  { maxRatio: 0.4, cycle: 1, tier: "intermediate" },
  { maxRatio: 0.55, cycle: 1, tier: "advanced" },
  { maxRatio: 0.7, cycle: 1, tier: "expert" },
  { maxRatio: 0.85, cycle: 2, tier: "foundation" },
  { maxRatio: 0.95, cycle: 2, tier: "intermediate" },
];

export function placementFromRatio(ratio: number): { cycle: number; tier: Tier } {
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  for (const band of PLACEMENT_BANDS) {
    if (clamped < band.maxRatio) return { cycle: band.cycle, tier: band.tier };
  }
  return { cycle: 2, tier: "advanced" };
}

export function scorePlacement(attempts: PlacementAttempt[]): PlacementResult {
  const earned = attempts.reduce(
    (sum, attempt) => sum + (attempt.firstAttemptCorrect ? TIER_WEIGHT[attempt.tier] : 0),
    0,
  );
  const possible = attempts.reduce((sum, attempt) => sum + TIER_WEIGHT[attempt.tier], 0);
  const ratio = possible === 0 ? 0 : earned / possible;
  const place = placementFromRatio(ratio);
  return {
    ...place,
    earned,
    possible,
    ratio,
    stage: knowledgeStage(place.cycle, place.tier),
  };
}

/**
 * Every placement-eligible question, easiest tier first.
 * Order inside a tier stays the order the questions were given (file order).
 * Scoring uses a ratio, so a 13-question quiz uses the same bands as a shorter one.
 */
export function selectPlacementQuestions(questions: Question[]): Question[] {
  const grouped = new Map<Tier, Question[]>(TIERS.map((tier) => [tier, []]));
  for (const question of questions) {
    if (!question.placement_eligible) continue;
    grouped.get(question.tier)?.push(question);
  }
  return TIERS.flatMap((tier) => grouped.get(tier) ?? []);
}
