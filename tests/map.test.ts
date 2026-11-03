import { describe, expect, it } from "vitest";
import { STAGE_LEARNING } from "@/lib/curriculum";
import { loadCatalog } from "@/lib/content/load";
import { badgeEarned, gateFromBadges, visibleMapStages } from "@/lib/game/badges";
import { advanceStage } from "@/lib/game/ladder";
import { knowledgePath } from "@/lib/game/path";
import { knowledgeStage, emptyProgress } from "@/lib/game/progression";
import { scorePlacement } from "@/lib/game/placement";
import type { GameProgress } from "@/lib/game/types";

describe("stage badge map", () => {
  it("keeps player-facing stage lines free of ages and difficulty", () => {
    for (const line of Object.values(STAGE_LEARNING)) {
      expect(line.toLowerCase()).not.toMatch(/age|easy|intermediate|advanced|expert|foundation|\bhard\b/);
    }
  });

  it("follows the outline: 218 badges and the cumulative book counts", () => {
    expect(knowledgePath.advanceRule).toBe("every-badge");
    const counts = knowledgePath.stages.map((stage) => [stage.stage, stage.badges.length, stage.books.length]);
    expect(counts).toEqual([
      ["Seed", 9, 8],
      ["Sprout", 17, 15],
      ["Rooted", 25, 24],
      ["Growing", 27, 32],
      ["Established", 29, 40],
      ["Fruitful", 69, 60],
      ["Deep Roots", 42, 66],
    ]);
    expect(knowledgePath.stages.reduce((sum, stage) => sum + stage.badges.length, 0)).toBe(218);
  });

  it("shows only the current stage until that stage is actually opened", () => {
    const seed = { ...emptyProgress(), stage: "Seed" as const };
    expect(visibleMapStages(seed)).toEqual(["Seed"]);
    const { questions } = loadCatalog();
    const seedQuestions = questions.filter((question) => question.stage === "Seed");
    let progress: GameProgress = seed;
    for (const question of seedQuestions) {
      progress = {
        ...progress,
        masteredIds: [...progress.masteredIds, question.id],
        firstTryIds: [...(progress.firstTryIds ?? []), question.id],
      };
    }
    expect(advanceStage(questions, progress).stage).toBe("Seed");
    expect(visibleMapStages(progress)).toEqual(["Seed"]);
    expect(visibleMapStages(progress)).not.toContain("Sprout");
  });

  it("shows skipped stages above a placed player and never a later stage", () => {
    const perfect = scorePlacement([{ questionId: "a", tier: "expert", firstAttemptCorrect: true }]);
    expect(perfect.stage).toBe("Established");
    expect(knowledgeStage(2, "advanced")).toBe("Deep Roots");

    const established = knowledgePath.stages.find((stage) => stage.stage === "Established");
    const finishedIds = established?.badges.flatMap((badge) => badge.questionIds) ?? [];
    expect(finishedIds.length).toBeGreaterThan(0);

    // Placement used to leave cycle and tier past the capped stage, and the map
    // then drew the next stage because those few questions were already finished.
    const placed: GameProgress = {
      ...emptyProgress(2, "advanced"),
      stage: perfect.stage,
      mapOrigin: perfect.stage,
      masteredIds: [...finishedIds, "c3-eph-0001"],
      firstTryIds: [...finishedIds, "c3-eph-0001"],
    };
    expect(knowledgeStage(placed.cycle, placed.tier)).toBe("Deep Roots");
    expect(visibleMapStages(placed)).toEqual(["Seed", "Sprout", "Rooted", "Growing", "Established"]);
    expect(visibleMapStages(placed)).not.toContain("Fruitful");
    expect(visibleMapStages(placed)).not.toContain("Deep Roots");
    expect(gateFromBadges(placed).ready).toBe(false);

    const jonah = knowledgePath.stages
      .find((stage) => stage.stage === "Seed")
      ?.badges.find((badge) => badge.id === "seed-jonah");
    expect(jonah).toBeTruthy();
    expect(badgeEarned(placed, jonah!)).toBe(false);
  });

  it("can switch the advance rule in the path file without another code change", () => {
    const earned = {
      ...emptyProgress(),
      stage: "Seed" as const,
      firstTryIds: ["only"],
      masteredIds: ["only"],
    };
    const path = {
      ...knowledgePath,
      advanceRule: "badges-with-questions" as const,
      stages: knowledgePath.stages.map((stage) =>
        stage.stage === "Seed"
          ? {
              ...stage,
              badges: [
                { id: "seed-creation", name: "Creation", art: "creation", questionIds: ["only"] },
                { id: "seed-empty", name: "Empty", art: "scroll", questionIds: [] },
              ],
            }
          : stage,
      ),
    };
    expect(gateFromBadges(earned, path).ready).toBe(true);
    expect(gateFromBadges(earned, { ...path, advanceRule: "every-badge" }).ready).toBe(false);
  });
});
