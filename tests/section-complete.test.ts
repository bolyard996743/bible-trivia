import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/lib/content/load";
import { applyMastery, emptyProgress } from "@/lib/game";
import type { Question, Tier } from "@/lib/game/types";

function inSectionTier(questions: Question[], tier: Tier): Question[] {
  return questions
    .filter((question) => question.section === "Genesis 37-50" && question.cycle === 1 && question.tier === tier)
    .sort((a, b) => a.id.localeCompare(b.id));
}

describe("Genesis 37-50 completion", () => {
  it("requires every question in the section at the current tier", () => {
    const { questions } = loadCatalog();
    const section = questions.filter((question) => question.section === "Genesis 37-50");
    expect(section.map((question) => question.id).sort()).toEqual([
      "c1-gen-0003",
      "c1-gen-0004",
      "c1-gen-0005",
      "c1-gen-0006",
      "c1-gen-0007",
      "c1-gen-0008",
      "c1-gen-0009",
      "c1-gen-0010",
      "c1-gen-0011",
      "c1-gen-0012",
      "c1-gen-0013",
      "c1-gen-0014",
      "c1-gen-0015",
      "c1-gen-0016",
      "c1-gen-0017",
      "c1-gen-0018",
      "c1-gen-0019",
    ]);

    const foundation = inSectionTier(questions, "foundation");
    expect(foundation.length).toBeGreaterThan(1);
    let progress = emptyProgress(1, "foundation");
    for (const question of foundation.slice(0, -1)) {
      const step = applyMastery(questions, progress, question.id, true);
      expect(step.event.type).toBe("mastered");
      progress = step.progress;
    }
    const finished = applyMastery(questions, progress, foundation.at(-1)!.id, true);
    expect(finished.event).toEqual({ type: "section_complete", section: "Genesis 37-50" });
  });
});
