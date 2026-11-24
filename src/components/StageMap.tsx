"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeEmblem, type BadgeEmblemStatus } from "@/components/BadgeEmblem";
import { STAGE_LEARNING, stageRank } from "@/lib/curriculum";
import { badgeEarned, badgeStatusLabel, stageSlug, visibleMapStages } from "@/lib/game/badges";
import { isBadgeWaiting } from "@/lib/game/badge-retry";
import { badgeAttention, hasSeenRecord, noticePlan, readSeenBadgesHere, writeSeenBadgesHere, type BadgeAttention } from "@/lib/game/badge-seen";
import { badgePlayHref, stagePath } from "@/lib/game/path";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function StageMap({
  progress,
  now = new Date(),
  playerKey = "local",
  seenBadgeIds,
  reducedMotion,
}: {
  progress: GameProgress;
  now?: Date;
  playerKey?: string;
  /** When set, the map does not read or write the seen list. Tests use this. */
  seenBadgeIds?: readonly string[];
  reducedMotion?: boolean;
}) {
  const stages = visibleMapStages(progress);
  const current = progress.stage ?? "Seed";
  const [storedSeen, setStoredSeen] = useState<string[] | null>(null);
  const [motion, setMotion] = useState(reducedMotion ?? false);

  useEffect(() => {
    if (reducedMotion !== undefined) return;
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

  const seen = seenBadgeIds ?? storedSeen;
  const reduce = reducedMotion ?? motion;
  const freshKey = (seen ? freshEarnedIds(progress, seen) : []).join("|");

  useEffect(() => {
    if (seenBadgeIds || !seen || freshKey.length === 0) return;
    writeSeenBadgesHere(playerKey, freshKey.split("|"));
  }, [playerKey, seenBadgeIds, seen, freshKey]);

  return (
    <div className="grid gap-5" data-testid="stage-map">
      {stages.map((stage) => (
        <StageBlock
          key={stage}
          stage={stage}
          current={current}
          progress={progress}
          now={now}
          seen={seen}
          reducedMotion={reduce}
        />
      ))}
    </div>
  );
}

function earnedBadgeIds(progress: GameProgress): string[] {
  const ids: string[] = [];
  for (const stage of visibleMapStages(progress)) {
    for (const badge of stagePath(stage)?.badges ?? []) {
      if (badgeEarned(progress, badge)) ids.push(badge.id);
    }
  }
  return ids;
}

function freshEarnedIds(progress: GameProgress, seen: readonly string[]): string[] {
  return earnedBadgeIds(progress).filter((id) => !seen.includes(id));
}

function StageBlock({
  stage,
  current,
  progress,
  now,
  seen,
  reducedMotion,
}: {
  stage: KnowledgeStage;
  current: KnowledgeStage;
  progress: GameProgress;
  now: Date;
  seen: readonly string[] | null;
  reducedMotion: boolean;
}) {
  const block = stagePath(stage);
  const skipped = stageRank(stage) < stageRank(current);
  return (
    <section
      className="stage-card grid gap-4"
      data-testid={`stage-block-${stageSlug(stage)}`}
      data-place={skipped ? "skipped" : "current"}
    >
      <div>
        <h2 className="text-3xl font-semibold text-grove-deep">{stage}</h2>
        <p className="mt-1 text-lg text-ink" data-testid={`stage-learning-${stageSlug(stage)}`}>
          {STAGE_LEARNING[stage]}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4" aria-label={`${stage} badges`}>
        {(block?.badges ?? []).map((badge) => {
          const earned = badgeEarned(progress, badge);
          const locked = !earned && isBadgeWaiting(progress, badge.id, now);
          const status: BadgeEmblemStatus = earned ? "earned" : locked ? "locked" : "empty";
          const attention: BadgeAttention = seen
            ? badgeAttention(earned, seen.includes(badge.id), reducedMotion)
            : "none";
          return (
            <li key={badge.id}>
              <Link
                href={badgePlayHref(badge.id)}
                data-testid={`badge-${badge.id}`}
                data-state={status}
                aria-label={badgeStatusLabel(badge.name, status)}
                className="badge-link flex flex-col items-center gap-2 rounded-2xl px-1 py-1"
              >
                <BadgeEmblem topic={badge.art} slug={badge.id} status={status} attention={attention} />
                <span className={`badge-caption ${earned ? "text-grove-deep" : "text-ink"}`}>{badge.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type { KnowledgeStage };
