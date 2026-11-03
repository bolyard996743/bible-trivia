import { describe, expect, it } from "vitest";
import { STAGE_LEARNING } from "@/lib/curriculum";
import { loadCatalog } from "@/lib/content/load";
import { sectionEarned, stageSections, visibleMapStages } from "@/lib/game/badges";
import { recordClear } from "@/lib/game/ladder";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress } from "@/lib/game/types";

describe("stage badge map", () => {
  it("keeps player-facing stage lines free of ages and difficulty", () => {
    for (const line of Object.values(STAGE_LEARNING)) {
      expect(line.toLowerCase()).not.toMatch(/age|easy|intermediate|advanced|expert|foundation|\bhard\b/);
    }
  });

  it("shows only the current stage until every badge is earned", () => {
    const { questions } = loadCatalog();
    const seed = { ...emptyProgress(), stage: "Seed" as const, mapOrigin: "Seed" as const };
    expect(visibleMapStages(questions, seed)).toEqual(["Seed"]);
    expect(stageSections(questions, "Seed")).toContain("Jonah 1");
    expect(sectionEarned(questions, seed, "Seed", "Jonah 1")).toBe(false);

    let progress: GameProgress = seed;
    const seedQuestions = questions.filter((question) => question.stage === "Seed");
    for (const question of seedQuestions) {
      progress = recordClear(
        { ...progress, masteredIds: [...progress.masteredIds, question.id] },
        question,
        true,
      );
    }
    expect(visibleMapStages(questions, progress)).toEqual(["Seed", "Sprout"]);
    expect(visibleMapStages(questions, progress)).not.toContain("Rooted");
    for (const section of stageSections(questions, "Seed")) {
      expect(sectionEarned(questions, progress, "Seed", section)).toBe(true);
    }
  });

  it("does not reveal earlier stages after a later placement", () => {
    const { questions } = loadCatalog();
    const placed = { ...emptyProgress(2, "foundation"), stage: "Established" as const, mapOrigin: "Established" as const };
    expect(visibleMapStages(questions, placed)).toEqual(["Established"]);
  });
});
