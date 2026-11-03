"use client";

import { BadgeArt } from "@/components/BadgeArt";
import { STAGE_LEARNING } from "@/lib/curriculum";
import {
  questionsInSection,
  sectionEarned,
  sectionSlug,
  stageSections,
  stageSlug,
  visibleMapStages,
} from "@/lib/game/badges";
import type { GameProgress, KnowledgeStage, Question } from "@/lib/game/types";

export function StageMap({ questions, progress }: { questions: Question[]; progress: GameProgress }) {
  const stages = visibleMapStages(questions, progress);

  return (
    <div className="grid gap-8" data-testid="stage-map">
      {stages.map((stage) => (
        <StageBlock key={stage} stage={stage} questions={questions} progress={progress} />
      ))}
    </div>
  );
}

function StageBlock({
  stage,
  questions,
  progress,
}: {
  stage: KnowledgeStage;
  questions: Question[];
  progress: GameProgress;
}) {
  const sections = stageSections(questions, stage);
  return (
    <section className="grid gap-4" data-testid={`stage-block-${stageSlug(stage)}`}>
      <div>
        <h2 className="text-3xl font-semibold text-grove-deep">{stage}</h2>
        <p className="mt-1 text-lg text-ink" data-testid={`stage-learning-${stageSlug(stage)}`}>
          {STAGE_LEARNING[stage]}
        </p>
      </div>
      <ul className="flex flex-wrap gap-3" aria-label={`${stage} badges`}>
        {sections.map((section) => {
          const earned = sectionEarned(questions, progress, stage, section);
          const topic = questionsInSection(questions, stage, section)[0]?.topics[0] ?? "";
          return (
            <li key={section}>
              <span
                data-testid={`badge-${sectionSlug(section)}`}
                data-state={earned ? "earned" : "empty"}
                role="img"
                aria-label={earned ? "Earned badge" : "Empty badge"}
                className={
                  earned
                    ? "inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-grove bg-gold-soft text-grove-deep"
                    : "inline-flex h-16 w-16 rounded-full border-2 border-dashed border-ink-soft/40 bg-ink-soft/10"
                }
              >
                {earned ? <BadgeArt topic={topic} /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type { KnowledgeStage };
