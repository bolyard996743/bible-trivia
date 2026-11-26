"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeEmblem, type BadgeEmblemStatus } from "@/components/BadgeEmblem";
import { STAGE_LEARNING, stageRank } from "@/lib/curriculum";
import { BADGE_AHEAD_NOTE, badgeEarned, badgeStatusLabel, mapStageRows, stageSlug, visibleBadges } from "@/lib/game/badges";
import { isBadgeWaiting } from "@/lib/game/badge-retry";
import { badgeAttention, hasSeenRecord, noticePlan, readSeenBadgesHere, writeSeenBadgesHere, type BadgeAttention } from "@/lib/game/badge-seen";
import { lockShakeMode, nextLockedBadgeId, planUnlock, readUnlockPlayed, writeUnlockPlayed, type LockShakeMode } from "@/lib/game/badge-unlock";
import { badgePlayHref, stagePath } from "@/lib/game/path";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function StageMap({
  progress,
  now = new Date(),
  playerKey = "local",
  seenBadgeIds,
  reducedMotion,
  shakeBadgeId,
}: {
  progress: GameProgress;
  now?: Date;
  playerKey?: string;
  /** When set, the map does not read or write the seen list. Tests use this. */
  seenBadgeIds?: readonly string[];
  reducedMotion?: boolean;
  /** When set, the map does not read or write the unlock list. Tests use this. */
  shakeBadgeId?: string | null;
}) {
  const stages = mapStageRows(progress);
  const current = progress.stage ?? "Seed";
  const [storedSeen, setStoredSeen] = useState<string[] | null>(null);
  const [motion, setMotion] = useState(reducedMotion ?? false);
  const [liveShake, setLiveShake] = useState<string | null>(null);
  const earnedKey = earnedBadgeIds(progress).join("|");

  useEffect(() => {
    if (reducedMotion !== undefined || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [reducedMotion]);

  useEffect(() => {
    if (seenBadgeIds) return;
    if (typeof window === "undefined") return;
    const earnedIds = earnedBadgeIds(progress);
    const plan = noticePlan(hasSeenRecord(window.localStorage, playerKey) ? readSeenBadgesHere(playerKey) : null, earnedIds);
    if (!hasSeenRecord(window.localStorage, playerKey)) writeSeenBadgesHere(playerKey, plan.seen);
    setStoredSeen(plan.seen);
    // The first visit records badges the player already earned, so only a later earn flashes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey, seenBadgeIds]);

  useEffect(() => {
    if (shakeBadgeId !== undefined) return;
    if (typeof window === "undefined") return;
    const earnedIds = earnedKey.length > 0 ? earnedKey.split("|") : [];
    const stored = readUnlockPlayed(window.localStorage, playerKey, "map");
    const plan = planUnlock(stored, earnedIds);
    writeUnlockPlayed(window.localStorage, playerKey, "map", plan.played);
    setLiveShake(plan.fresh.length > 0 ? nextLockedBadgeId(progress) : null);
    // earnedKey already lists the badges that can unlock. Progress is read for the next lock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedKey, playerKey, shakeBadgeId]);

  const seen = seenBadgeIds ?? storedSeen;
  const reduce = reducedMotion ?? motion;
  const shakeId = shakeBadgeId !== undefined ? shakeBadgeId : liveShake;
  const freshKey = (seen ? freshEarnedIds(progress, seen) : []).join("|");

  useEffect(() => {
    if (seenBadgeIds || !seen || freshKey.length === 0) return;
    writeSeenBadgesHere(playerKey, freshKey.split("|"));
  }, [playerKey, seenBadgeIds, seen, freshKey]);

  return (
    <div className="grid gap-5" data-testid="stage-map">
      {stages.map((row) => (
        <StageBlock
          key={row.stage}
          stage={row.stage}
          ahead={row.ahead}
          current={current}
          progress={progress}
          now={now}
          seen={seen}
          reducedMotion={reduce}
          shakeId={shakeId}
        />
      ))}
    </div>
  );
}

function earnedBadgeIds(progress: GameProgress): string[] {
  const ids: string[] = [];
  for (const stage of mapStageRows(progress)) {
    for (const badge of visibleBadges(stagePath(stage.stage)?.badges ?? [])) {
      if (badgeEarned(progress, badge)) ids.push(badge.id);
    }
  }
  return ids;
}

function shakeClass(mode: LockShakeMode): string {
  if (mode === "shake") return " badge-lock-shake";
  if (mode === "still") return " badge-lock-still";
  return "";
}

function freshEarnedIds(progress: GameProgress, seen: readonly string[]): string[] {
  return earnedBadgeIds(progress).filter((id) => !seen.includes(id));
}

function StageBlock({
  stage,
  ahead,
  current,
  progress,
  now,
  seen,
  reducedMotion,
  shakeId,
}: {
  stage: KnowledgeStage;
  ahead: boolean;
  current: KnowledgeStage;
  progress: GameProgress;
  now: Date;
  seen: readonly string[] | null;
  reducedMotion: boolean;
  shakeId: string | null;
}) {
  const block = stagePath(stage);
  const badges = visibleBadges(block?.badges ?? []);
  const earnedCount = badges.filter((badge) => badgeEarned(progress, badge)).length;
  const skipped = !ahead && stageRank(stage) < stageRank(current);
  return (
    <section
      className="stage-card grid gap-4"
      data-testid={`stage-block-${stageSlug(stage)}`}
      data-place={ahead ? "locked" : skipped ? "skipped" : "current"}
    >
      <div>
        {ahead ? (
          <h2 className="text-3xl font-semibold text-grove-deep">{stage}</h2>
        ) : (
          <h2 className="stage-heading text-3xl font-semibold text-grove-deep">
            <span>{stage}</span>
            <span className="stage-count" data-testid={`stage-count-${stageSlug(stage)}`}>
              {earnedCount} of {badges.length}
            </span>
          </h2>
        )}
        <p className="mt-1 text-lg text-ink" data-testid={`stage-learning-${stageSlug(stage)}`}>
          {STAGE_LEARNING[stage]}
        </p>
        {ahead ? (
          <p className="mt-1 text-base text-ink-soft" data-testid="badge-unlock-note">
            {BADGE_AHEAD_NOTE}
          </p>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 min-[24rem]:grid-cols-3 sm:grid-cols-4" aria-label={`${stage} badges`}>
        {badges.map((badge) => {
          const earned = badgeEarned(progress, badge);
          const waiting = !earned && !ahead && isBadgeWaiting(progress, badge.id, now);
          const status: BadgeEmblemStatus = earned ? "earned" : ahead ? "sealed" : waiting ? "locked" : "empty";
          const attention: BadgeAttention = seen
            ? badgeAttention(earned, seen.includes(badge.id), reducedMotion)
            : "none";
          const faded = !earned;
          const shake = lockShakeMode(badge.id === shakeId, reducedMotion);
          const className = `badge-link flex flex-col items-center gap-2 rounded-2xl px-1 py-1${faded ? " map-unearned" : ""}`;
          const itemClass = `min-w-0${shakeClass(shake)}`;
          const mark = (
            <>
              <BadgeEmblem topic={badge.art} slug={badge.id} status={status} attention={attention} />
              <span className={`badge-caption ${earned ? "text-grove-deep" : "text-ink"}`}>{badge.name}</span>
            </>
          );
          if (ahead) {
            return (
              <li key={badge.id} className={itemClass} data-lock-shake={shake === "none" ? undefined : shake}>
                <div
                  data-testid={`badge-${badge.id}`}
                  data-state={status}
                  role="group"
                  aria-label={badgeStatusLabel(badge.name, status)}
                  className={className}
                >
                  {mark}
                </div>
              </li>
            );
          }
          return (
            <li key={badge.id} className={itemClass} data-lock-shake={shake === "none" ? undefined : shake}>
              <Link
                href={badgePlayHref(badge.id)}
                data-testid={`badge-${badge.id}`}
                data-state={status}
                aria-label={badgeStatusLabel(badge.name, status)}
                className={className}
              >
                {mark}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type { KnowledgeStage };
