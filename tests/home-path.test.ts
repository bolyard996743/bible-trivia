import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KnowledgePath } from "@/components/KnowledgePath";
import { StageMap } from "@/components/StageMap";
import { knowledgePath } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

function progressAt(stage: KnowledgeStage): GameProgress {
  const creation = knowledgePath.stages[0]?.badges.find((badge) => badge.id === "seed-creation");
  return {
    ...emptyProgress(),
    stage,
    badgeRetries: {
      "seed-creation": { correctIds: [...(creation?.questionIds ?? [])] },
    },
  };
}

function stageNames(html: string): string[] {
  return [...html.matchAll(/data-testid="path-stage-([^"]+)"/g)].map((match) => match[1] ?? "");
}

describe("home knowledge path", () => {
  it("shows only the stage a Seed player has reached, without badge names", () => {
    const progress = progressAt("Seed");
    const home = renderToStaticMarkup(createElement(KnowledgePath, { progress, variant: "reached" }));
    expect(stageNames(home)).toEqual(["seed"]);
    expect(home).toContain("You are here");
    expect(home).toContain('data-variant="reached"');
    expect(home).not.toContain("Creation");
    expect(home).not.toContain("Noah");
    expect(home).not.toContain("Moses");
    expect(home).not.toContain("earned-badge-");
    expect(home).not.toContain("path-locked-note");
    expect(home).not.toContain("Unlocks after");
    expect(home.toLowerCase()).not.toMatch(/\b(difficulty|easy|intermediate|advanced|expert|age)\b/);

    const full = renderToStaticMarkup(createElement(KnowledgePath, { progress }));
    expect(full).toContain("earned-badge-seed-creation");
    expect(full).toContain(">Creation<");
    expect(full).toContain("path-stage-fruitful");
    expect(full).toContain("path-stage-deep-roots");
    expect(full).toContain("Unlocks after you earn every badge before it");
  });

  it("lists every reached stage for an Established player and leaves the path map detailed", () => {
    const progress = progressAt("Established");
    const home = renderToStaticMarkup(createElement(KnowledgePath, { progress, variant: "reached" }));
    expect(stageNames(home)).toEqual(["seed", "sprout", "rooted", "growing", "established"]);
    expect(home).toContain("You are here");
    expect(home).not.toContain("path-stage-fruitful");
    expect(home).not.toContain("path-stage-deep-roots");
    expect(home).not.toContain("Creation");
    expect(home).not.toContain("Unlocks after");
    expect(home).not.toContain('data-ahead="true"');

    const map = renderToStaticMarkup(createElement(StageMap, { progress, seenBadgeIds: ["seed-creation"] }));
    expect(map).toContain("stage-block-seed");
    expect(map).toContain("stage-block-established");
    expect(map).toContain("stage-block-fruitful");
    expect(map).toContain("stage-block-deep-roots");
    expect(map).toContain('data-place="locked"');
    expect(map).toContain("badge-seed-creation");
    expect(map).toContain(">Creation<");
    expect(map).toContain("Unlocks after you earn every badge before it");
  });
});
