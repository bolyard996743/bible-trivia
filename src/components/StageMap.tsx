"use client";

import Link from "next/link";
import { BadgeArt } from "@/components/BadgeArt";
import { STAGE_LEARNING, stageRank } from "@/lib/curriculum";
import { badgeEarned, stageSlug, visibleMapStages } from "@/lib/game/badges";
import { badgePlayHref, stagePath } from "@/lib/game/path";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function StageMap({ progress }: { progress: GameProgress }) {
  const stages = visibleMapStages(progress);
  const current = progress.stage ?? "Seed";

  return (
    <div className="grid gap-8" data-testid="stage-map">
      {stages.map((stage) => (
        <StageBlock key={stage} stage={stage} current={current} progress={progress} />
      ))}
    </div>
  );
}

function StageBlock({
  stage,
  current,
  progress,
}: {
  stage: KnowledgeStage;
  current: KnowledgeStage;
  progress: GameProgress;
}) {
  const block = stagePath(stage);
  const skipped = stageRank(stage) < stageRank(current);
  return (
    <section
      className="grid gap-4"
      data-testid={`stage-block-${stageSlug(stage)}`}
      data-place={skipped ? "skipped" : "current"}
    >
      <div>
        <h2 className="text-3xl font-semibold text-grove-deep">{stage}</h2>
        <p className="mt-1 text-lg text-ink" data-testid={`stage-learning-${stageSlug(stage)}`}>
          {STAGE_LEARNING[stage]}
        </p>
      </div>
      <ul className="flex flex-wrap gap-3" aria-label={`${stage} badges`}>
        {(block?.badges ?? []).map((badge) => {
          const earned = badgeEarned(progress, badge);
          return (
            <li key={badge.id}>
              <Link
                href={badgePlayHref(badge.id)}
                data-testid={`badge-${badge.id}`}
                data-state={earned ? "earned" : "empty"}
                aria-label={earned ? `${badge.name}. Earned` : `${badge.name}. Not earned yet`}
                className={
                  earned
                    ? "badge-link inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-grove bg-gold-soft text-grove-deep"
                    : "badge-link inline-flex h-16 w-16 rounded-full border-2 border-dashed border-ink-soft/40 bg-ink-soft/10"
                }
              >
                {earned ? <BadgeArt topic={badge.art} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type { KnowledgeStage };
