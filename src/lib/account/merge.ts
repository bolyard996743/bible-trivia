import { stageRank } from "../curriculum";
import { knowledgeStage } from "../game/progression";
import { TIERS, type AttemptState, type GameProgress, type KnowledgeStage, type Tier } from "../game/types";
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

function furtherStage(left?: KnowledgeStage, right?: KnowledgeStage): KnowledgeStage {
  const a = left ?? "Seed";
  const b = right ?? "Seed";
  return stageRank(a) >= stageRank(b) ? a : b;
}

function preferAttempt(local: GameProgress, remote: GameProgress): AttemptState | null {
  if ("openAttempt" in local) return local.openAttempt ?? null;
  return remote.openAttempt ?? null;
}

export function mergeLadderProgress(local: GameProgress, remote: GameProgress): GameProgress {
  const stage = furtherStage(local.stage, remote.stage);
  return {
    cycle: local.cycle,
    tier: local.tier,
    masteredIds: unionIds(local.masteredIds, remote.masteredIds),
    missCounts: maxMisses(local, remote),
    streak: Math.max(local.streak, remote.streak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    seasonMasteredCount: Math.max(local.seasonMasteredCount, remote.seasonMasteredCount),
    stage,
    seasonId: local.seasonId ?? remote.seasonId ?? "season-1",
    clearedTopics: unionIds(local.clearedTopics, remote.clearedTopics),
    clearedBooks: unionIds(local.clearedBooks, remote.clearedBooks),
    scoredIds: unionIds(local.scoredIds, remote.scoredIds),
    placementIds: unionIds(local.placementIds, remote.placementIds),
    draw: Math.max(local.draw ?? 0, remote.draw ?? 0),
    points: Math.max(local.points ?? 0, remote.points ?? 0),
    openAttempt: preferAttempt(local, remote),
  };
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
  const ladder = mergeLadderProgress(local.progress, remote.progress);

  const state: StoredState = {
    version: 1,
    ageGroup: local.ageGroup,
    mascot: local.mascot,
    soundOn: local.soundOn,
    showDifficulty: local.showDifficulty === true || remote.showDifficulty === true,
    placementComplete: local.placementComplete || remote.placementComplete,
    placement,
    progress: {
      ...ladder,
      cycle: further.cycle,
      tier: further.tier,
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
