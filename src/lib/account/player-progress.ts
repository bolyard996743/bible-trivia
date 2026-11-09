import { stageRank } from "../curriculum";
import { earnedFirstTryIds } from "../game/badges";
import { TIERS, type AgeGroup, type AttemptState, type MascotId, type Tier } from "../game/types";
import type { StoredState } from "../storage";
import { mergeLadderProgress } from "./merge";

type Placement = NonNullable<StoredState["placement"]>;

/**
 * Change the guide only. Badges, stage, answers, attempts, and placement stay.
 */
export function withGuide(
  state: StoredState,
  guide: { ageGroup: AgeGroup; mascot: MascotId; soundOn: boolean },
): StoredState {
  return {
    ...state,
    ageGroup: guide.ageGroup,
    mascot: guide.mascot,
    soundOn: guide.soundOn,
  };
}

function pathScore(cycle: number, tier: Tier): number {
  const tierIndex = Math.max(0, TIERS.indexOf(tier));
  return (Math.max(1, cycle) - 1) * TIERS.length + tierIndex;
}

function laterDate(left: string | null | undefined, right: string | null | undefined): string | null {
  if (!left) return right ?? null;
  if (!right) return left;
  return left >= right ? left : right;
}

function placementScore(placement: Placement): number {
  const ratio = placement.possible > 0 ? placement.earned / placement.possible : 0;
  return stageRank(placement.stage) * 1_000_000 + ratio * 1_000 + placement.earned;
}

function bestPlacement(left: StoredState["placement"], right: StoredState["placement"]): StoredState["placement"] {
  if (!left) return right;
  if (!right) return left;
  return placementScore(left) >= placementScore(right) ? left : right;
}

function betterAttempt(left?: AttemptState | null, right?: AttemptState | null): AttemptState | null {
  if (!left) return right ?? null;
  if (!right) return left;
  return left.missCount >= right.missCount ? left : right;
}

function combinePlayers(left: StoredState, right: StoredState): StoredState {
  const further =
    pathScore(left.progress.cycle, left.progress.tier) >= pathScore(right.progress.cycle, right.progress.tier)
      ? left.progress
      : right.progress;
  const ladder = mergeLadderProgress(
    { ...left.progress, firstTryIds: earnedFirstTryIds(left.progress) },
    { ...right.progress, firstTryIds: earnedFirstTryIds(right.progress) },
  );
  return {
    version: 1,
    ageGroup: left.ageGroup,
    mascot: left.mascot,
    soundOn: left.soundOn,
    showDifficulty: left.showDifficulty === true || right.showDifficulty === true,
    placementComplete: left.placementComplete || right.placementComplete,
    placement: bestPlacement(left.placement, right.placement),
    progress: {
      ...ladder,
      cycle: further.cycle,
      tier: further.tier,
      openAttempt: betterAttempt(left.progress.openAttempt, right.progress.openAttempt),
    },
    lastVisitedOn: laterDate(left.lastVisitedOn, right.lastVisitedOn),
    celebration: null,
    ...(left.username || right.username ? { username: left.username ?? right.username } : {}),
  };
}

/**
 * Fold several copies of one player into a single record.
 * An earned badge, the further stage, the better placement, and the higher score win.
 * The first record keeps the guide unless `mascot` is passed.
 */
export function mergeBestPlayerState(
  states: Array<StoredState | null | undefined>,
  mascot?: MascotId,
): StoredState | null {
  const records = states.filter((state): state is StoredState => state != null);
  const first = records[0];
  if (!first) return null;
  const merged = records.slice(1).reduce(combinePlayers, first);
  return mascot ? { ...merged, mascot } : merged;
}
