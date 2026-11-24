"use client";

import Link from "next/link";
import { BadgeEmblem, type BadgeEmblemStatus } from "@/components/BadgeEmblem";
import { STAGE_LEARNING, stageRank } from "@/lib/curriculum";
import { badgeEarned, badgeStatusLabel, stageSlug, visibleMapStages } from "@/lib/game/badges";
import { isBadgeWaiting } from "@/lib/game/badge-retry";
import { badgePlayHref, stagePath } from "@/lib/game/path";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function StageMap({ progress, now = new Date() }: { progress: GameProgress; now?: Date }) {
  const stages = visibleMapStages(progress);
  const current = progress.stage ?? "Seed";

  return (
    <div className="grid gap-5" data-testid="stage-map">
      {stages.map((stage) => (
        <StageBlock key={stage} stage={stage} current={current} progress={progress} now={now} />
      ))}
    </div>
  );
}

function StageBlock({
  stage,
  current,
  progress,
  now,
}: {
  stage: KnowledgeStage;
  current: KnowledgeStage;
  progress: GameProgress;
  now: Date;
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
          return (
            <li key={badge.id}>
              <Link
                href={badgePlayHref(badge.id)}
                data-testid={`badge-${badge.id}`}
                data-state={status}
                aria-label={badgeStatusLabel(badge.name, status)}
                className="badge-link flex flex-col items-center gap-2 rounded-2xl px-1 py-1"
              >
                <BadgeEmblem topic={badge.art} slug={badge.id} status={status} />
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
