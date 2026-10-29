import { describe, expect, it } from "vitest";
import { TIER_MIX } from "@/lib/curriculum";
import { loadCatalog } from "@/lib/content/load";
import { attemptPoints, gateStatus, recordClear, selectLadderQuestion, tierForRoll } from "@/lib/game/ladder";
import { emptyProgress } from "@/lib/game/progression";
import type { Question, Tier } from "@/lib/game/types";

function sample(id: string, tier: Tier, stage: Question["stage"], topics: string[], book = "Genesis"): Question {
  return {
    id,
    cycle: 1,
    tier,
    stage,
    testament: "OT",
    book,
    section: book,
    topics,
    placement_eligible: false,
    type: "multiple_choice",
    prompt: { adult: id },
    choices: [
      { id: "a", text: "One" },
      { id: "b", text: "Two" },
      { id: "c", text: "Three" },
      { id: "d", text: "Four" },
    ],
    answer: "a",
    teaching: {
      verses: [{ ref: "Genesis 1:1", text: "In the beginning.", translation: "NKJV" }],
      explanation: { adult: "Read the verse." },
      takeaway: "A beginning.",
    },
    review: { status: "draft", notes: "" },
  };
}

describe("curriculum ladder", () => {
  it("gives 10, 5, 2, or 0 points by attempt", () => {
    expect(attemptPoints(0, false, false)).toBe(10);
    expect(attemptPoints(1, false, false)).toBe(5);
    expect(attemptPoints(2, false, false)).toBe(2);
    expect(attemptPoints(4, false, false)).toBe(2);
    expect(attemptPoints(0, true, false)).toBe(0);
    expect(attemptPoints(0, false, true)).toBe(0);
  });

  it("borrows the next lower tier when the rolled tier is empty", () => {
    expect(tierForRoll("Seed", 0, new Set(["foundation"]))).toBe("foundation");
    expect(tierForRoll("Deep Roots", 90, new Set(["foundation"]))).toBe("foundation");
    expect(TIER_MIX.Seed.foundation).toBe(100);
    expect(TIER_MIX["Deep Roots"].expert).toBe(55);
  });

  it("keeps about four new questions for every review", () => {
    const questions = [
      sample("new", "foundation", "Sprout", ["miracles"]),
      sample("old", "foundation", "Seed", ["creation"]),
    ];
    const progress = {
      ...emptyProgress(),
      stage: "Sprout" as const,
      masteredIds: ["old"],
    };
    const draws = Array.from({ length: 20 }, (_, draw) => selectLadderQuestion(questions, { ...progress, draw }));
    const reviews = draws.filter((pick) => pick?.review).length;
    expect(reviews).toBe(4);
  });

  it("serves the next canonical book and skips one already cleared", () => {
    const questions = [
      sample("gen", "foundation", "Growing", ["roman-road"], "Genesis"),
      sample("exo", "foundation", "Growing", ["roman-road"], "Exodus"),
    ];
    const first = selectLadderQuestion(questions, { ...emptyProgress(), stage: "Growing" });
    expect(first?.question.id).toBe("gen");
    const second = selectLadderQuestion(questions, {
      ...emptyProgress(),
      stage: "Growing",
      clearedBooks: ["Genesis"],
    });
    expect(second?.question.id).toBe("exo");
  });

  it("does not block a topic or book that has no content", () => {
    const questions = [sample("create", "foundation", "Seed", ["creation"])];
    const progress = recordClear(emptyProgress(), questions[0]!, true);
    const status = gateStatus(questions, { ...progress, clearedBooks: ["Genesis", "Luke"] });
    expect(status.ready).toBe(true);
    expect(status.required).toBeLessThan(9);
  });

  it("opens Seed on the creation question from the live catalog", () => {
    const { questions } = loadCatalog();
    const pick = selectLadderQuestion(questions, emptyProgress());
    expect(pick?.review).toBe(false);
    expect(pick?.question.id).toBe("c1-gen-0001");
  });
});
