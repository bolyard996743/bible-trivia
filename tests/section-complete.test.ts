import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/lib/content/load";
import { applyMastery, emptyProgress } from "@/lib/game";

describe("Genesis 37-50 completion", () => {
  it("does not call a one-question section complete", () => {
    const { questions } = loadCatalog();
    const section = questions.filter((question) => question.section === "Genesis 37-50");
    expect(section.map((question) => question.id)).toEqual(["c1-gen-0003"]);
    const step = applyMastery(questions, emptyProgress(1, "intermediate"), "c1-gen-0003", true);
    expect(step.event.type).toBe("mastered");
    expect(step.progress.tier).toBe("intermediate");
  });
});
