import { knowledgeStage } from "../game/progression";
import { TIERS, type GameProgress, type Tier } from "../game/types";
import type { VerseMark } from "../bible/marks";
import type { StoredState } from "../storage";
import { isAccountAge } from "./policy";

export type MergeResult = {
  state: StoredState | null;
  marks: VerseMark[];
  /** False when the device belongs to a child, or there is nothing to upload. */
  upload: boolean;
};

function pathScore(cycle: number, tier: Tier): number {
  const tierIndex = Math.max(0, TIERS.indexOf(tier));
  return (Math.max(1, cycle) - 1) * TIERS.length + tierIndex;
}

function missMap(progress: GameProgress | undefined): Record<string, number> {
  return progress?.missCounts ?? {};
}

function maxMisses(left: GameProgress | undefined, right: GameProgress | undefined): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const [id, count] of Object.entries(missMap(left))) merged[id] = count;
  for (const [id, count] of Object.entries(missMap(right))) {
    merged[id] = Math.max(merged[id] ?? 0, count);
  }
  return merged;
}

function unionIds(left: string[] | undefined, right: string[] | undefined): string[] {
  return [...new Set([...(left ?? []), ...(right ?? [])])];
}

function laterDate(left: string | null | undefined, right: string | null | undefined): string | null {
  if (!left) return right ?? null;
  if (!right) return left;
  return left >= right ? left : right;
}

function mergeMarks(localMarks: VerseMark[], remoteMarks: VerseMark[]): VerseMark[] {
  const byId = new Map<string, VerseMark>();
  for (const mark of [...localMarks, ...remoteMarks]) {
    const current = byId.get(mark.id);
    if (!current || mark.updatedAt >= current.updatedAt) byId.set(mark.id, mark);
  }
  return [...byId.values()];
}

function choosePlacement(local: StoredState, remote: StoredState): StoredState["placement"] {
  if (!local.placement) return remote.placement;
  if (!remote.placement) return local.placement;
  const localRank = pathScore(local.placement.cycle, local.placement.tier) * 1000 + local.placement.earned;
  const remoteRank = pathScore(remote.placement.cycle, remote.placement.tier) * 1000 + remote.placement.earned;
  return localRank >= remoteRank ? local.placement : remote.placement;
}

/**
 * Combine this device with an account. Mastered questions, miss counts, streaks,
 * and notes are unioned or kept at the higher value. A child device is never uploaded.
 */
export function mergeAccountProgress(
  local: StoredState | null,
  remote: StoredState | null,
  localMarks: VerseMark[] = [],
  remoteMarks: VerseMark[] = [],
): MergeResult {
  if (local?.ageGroup === "child") {
    return { state: local, marks: localMarks, upload: false };
  }
  if (!local && !remote) return { state: null, marks: [], upload: false };
  if (!remote) return { state: local, marks: localMarks, upload: Boolean(local && isAccountAge(local.ageGroup)) };
  if (!local) return { state: remote, marks: remoteMarks, upload: false };
  if (!isAccountAge(local.ageGroup)) {
    return { state: local, marks: localMarks, upload: false };
  }

  const localFurther = pathScore(local.progress.cycle, local.progress.tier);
  const remoteFurther = pathScore(remote.progress.cycle, remote.progress.tier);
  const further = localFurther >= remoteFurther ? local.progress : remote.progress;
  const placement = choosePlacement(local, remote);

  const state: StoredState = {
    version: 1,
    ageGroup: local.ageGroup,
    mascot: local.mascot,
    soundOn: local.soundOn,
    placementComplete: local.placementComplete || remote.placementComplete,
    placement,
    progress: {
      cycle: further.cycle,
      tier: further.tier,
      masteredIds: unionIds(local.progress.masteredIds, remote.progress.masteredIds),
      missCounts: maxMisses(local.progress, remote.progress),
      streak: Math.max(local.progress.streak, remote.progress.streak),
      bestStreak: Math.max(local.progress.bestStreak, remote.progress.bestStreak),
      seasonMasteredCount: Math.max(local.progress.seasonMasteredCount, remote.progress.seasonMasteredCount),
    },
    lastVisitedOn: laterDate(local.lastVisitedOn, remote.lastVisitedOn),
    celebration: null,
  };

  return {
    state: {
      ...state,
      placement: placement
        ? { ...placement, stage: placement.stage || knowledgeStage(placement.cycle, placement.tier) }
        : null,
    },
    marks: mergeMarks(localMarks, remoteMarks),
    upload: true,
  };
}

export function hasDeviceProgress(state: StoredState | null, marks: VerseMark[]): boolean {
  if (marks.length > 0) return true;
  if (!state) return false;
  return (
    state.placementComplete ||
    state.progress.masteredIds.length > 0 ||
    state.progress.streak > 0 ||
    state.progress.bestStreak > 0 ||
    Object.keys(state.progress.missCounts ?? {}).length > 0
  );
}
