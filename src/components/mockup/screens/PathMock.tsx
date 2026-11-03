"use client";

import { useState } from "react";
import { type KnowledgeStage } from "@/lib/game/types";
import { STAGE_EXAMPLES, currentStage, stageStatuses, type PlayerState } from "@/lib/mockup/preview";
import { ExampleCard, ScreenHeading } from "../ui";
import { usePreview } from "../preview-context";

export function PathMock() {
  const { preview } = usePreview();
  const statuses = stageStatuses(preview.player);
  const here = currentStage(preview.player);
  const [picked, setPicked] = useState<{ player: PlayerState; stage: KnowledgeStage }>({
    player: preview.player,
    stage: here,
  });
  const selected = picked.player === preview.player ? picked.stage : here;
  const selectedStatus = statuses.find((stage) => stage.name === selected)?.status ?? "here";

  return (
    <section className="grid gap-4" data-testid="mockup-path">
      <ScreenHeading
        kicker="Path · example"
        title={preview.player === "new" ? "Seed is the first step" : "Growing, with three stages behind you"}
        body={
          preview.player === "new"
            ? "A new player stands at Seed. Later stages stay locked until the path is walked."
            : "This example player has cleared Seed, Sprout, and Rooted. Growing is the current stage."
        }
      />
      <ol className="grid gap-2" aria-label="Knowledge Path example">
        {statuses.map((stage) => {
          const open = stage.name === selected;
          return (
            <li key={stage.name}>
              <button
                type="button"
                data-testid={`mockup-stage-${stage.name}`}
                aria-pressed={open}
                onClick={() => setPicked({ player: preview.player, stage: stage.name })}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left text-lg ${
                  stage.status === "here"
                    ? "border-grove bg-grove font-semibold text-white"
                    : "border-line bg-card text-ink"
                }`}
              >
                <span>{stage.name}</span>
                <span className={`text-base ${stage.status === "here" ? "text-white" : "text-ink-soft"}`}>
                  {stage.status === "here" ? "You are here" : stage.status === "done" ? "Example done" : "Locked"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <ExampleCard testId="mockup-stage-detail">
        <p className="text-base font-semibold text-gold">{selected} · example</p>
        {selectedStatus === "ahead" ? (
          <p className="mt-1 text-lg text-ink">This stage is still ahead for this example player.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {STAGE_EXAMPLES[selected].map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-parchment px-3 py-2 text-lg text-ink">
                {item}
              </li>
            ))}
          </ul>
        )}
      </ExampleCard>
    </section>
  );
}
