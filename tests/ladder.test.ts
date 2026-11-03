import { describe, expect, it } from "vitest";
import { TIER_MIX, topicLabel } from "@/lib/curriculum";
import { loadCatalog } from "@/lib/content/load";
import { attemptForQuestion } from "@/lib/game/mastery";
import {
  attemptPoints,
  gateStatus,
  questionMarkers,
  recordClear,
  selectLadderQuestion,
  stageChecklist,
  tierForRoll,
} from "@/lib/game/ladder";
import { emptyProgress } from "@/lib/game/progression";
import { createState, parseState } from "@/lib/storage";
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
    expect(TIER_MIX["Deep Roots"].expert).toBe(60);
    expect(TIER_MIX.Rooted.advanced).toBe(0);
    expect(TIER_MIX.Growing.intermediate).toBeGreaterThan(TIER_MIX.Growing.advanced);
    expect(TIER_MIX.Established.intermediate).toBeGreaterThan(TIER_MIX.Established.advanced);
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

  it("does not open the next stage while empty badges remain", () => {
    const questions = [sample("create", "foundation", "Seed", ["creation"])];
    const progress = recordClear({ ...emptyProgress(), stage: "Seed" }, questions[0]!, true);
    const status = gateStatus(questions, progress);
    expect(status.ready).toBe(false);
    expect(status.required).toBe(9);
  });

  it("opens Seed on the creation question from the live catalog", () => {
    const { questions } = loadCatalog();
    const pick = selectLadderQuestion(questions, emptyProgress());
    expect(pick?.review).toBe(false);
    expect(pick?.question.id).toBe("c1-gen-0001");
  });

  it("reviews a mastered question on every 5th draw, including the first stage", () => {
    const questions = [
      sample("first", "foundation", "Seed", ["creation"]),
      sample("second", "foundation", "Seed", ["noah"], "Exodus"),
    ];
    const progress = {
      ...emptyProgress(),
      stage: "Seed" as const,
      masteredIds: ["first"],
      draw: 4,
    };
    const review = selectLadderQuestion(questions, progress);
    expect(review?.review).toBe(true);
    expect(review?.question.id).toBe("first");
    const fresh = selectLadderQuestion(questions, { ...progress, draw: 5 });
    expect(fresh?.review).toBe(false);
    expect(fresh?.question.id).toBe("second");
  });

  it("does not serve a later stage's question before that stage", () => {
    const questions = [
      sample("later", "foundation", "Growing", ["creation"], "Genesis"),
      sample("now", "foundation", "Seed", ["noah"], "Exodus"),
    ];
    expect(selectLadderQuestion(questions, emptyProgress())?.question.id).toBe("now");
  });

  it("does not ask a placement question again", () => {
    const questions = [
      sample("placed", "foundation", "Seed", ["noah"]),
      sample("fresh", "foundation", "Seed", ["creation"], "Exodus"),
    ];
    const pick = selectLadderQuestion(questions, {
      ...emptyProgress(),
      masteredIds: ["placed"],
      placementIds: ["placed"],
    });
    expect(pick?.question.id).toBe("fresh");
    expect(pick?.review).toBe(false);
    const again = selectLadderQuestion(questions, {
      ...emptyProgress(),
      stage: "Sprout",
      masteredIds: ["placed"],
      placementIds: ["placed"],
      draw: 4,
    });
    expect(again?.question.id).not.toBe("placed");
  });

  it("does not treat a cleared book name as a finished stage", () => {
    const questions = [
      sample("gen", "foundation", "Growing", ["roman-road"], "Genesis"),
      sample("exo", "foundation", "Growing", ["roman-road"], "Exodus"),
      sample("lev", "foundation", "Growing", ["roman-road"], "Leviticus"),
    ];
    const status = gateStatus(questions, {
      ...emptyProgress(),
      stage: "Growing",
      firstTryIds: ["gen"],
      masteredIds: ["gen"],
      clearedBooks: ["Genesis", "Obadiah", "Jude"],
    });
    expect(status.required).toBe(27);
    expect(status.ready).toBe(false);
  });

  it("does not treat an empty Sprout checklist as already met", () => {
    const { questions } = loadCatalog();
    const sprout = questions.filter((question) => question.stage === "Sprout");
    expect(sprout.length).toBeGreaterThan(0);
    const open = gateStatus(questions, { ...emptyProgress(), stage: "Sprout" });
    expect(open.ready).toBe(false);
    expect(open.required).toBeGreaterThan(0);
    const done = gateStatus(questions, {
      ...emptyProgress(),
      stage: "Sprout",
      masteredIds: sprout.map((question) => question.id),
      firstTryIds: sprout.map((question) => question.id),
    });
    expect(done.ready).toBe(false);
    expect(done.required).toBe(17);
  });

  it("names checklist topics and marks a cleared one", () => {
    const questions = [sample("create", "foundation", "Seed", ["creation"])];
    const before = stageChecklist(questions, emptyProgress());
    const creation = before.find((item) => item.id === "creation");
    expect(creation).toMatchObject({ label: "Creation", state: "open" });
    expect(creation?.label).not.toBe("creation");
    expect(topicLabel("david-goliath")).toBe("David and Goliath");
    const cleared = stageChecklist(questions, recordClear(emptyProgress(), questions[0]!, true));
    expect(cleared.find((item) => item.id === "creation")?.state).toBe("cleared");
    expect(cleared.find((item) => item.id === "noah")?.state).toBe("coming-soon");
  });

  it("hides difficulty until the player turns it on and labels a review", () => {
    expect(questionMarkers({ review: true, tier: "foundation", showDifficulty: false })).toEqual({
      review: "Review",
      difficulty: null,
    });
    expect(questionMarkers({ review: false, tier: "expert", showDifficulty: true })).toEqual({
      review: null,
      difficulty: "Expert",
    });
    expect(questionMarkers({ review: false, tier: "intermediate", showDifficulty: false }).difficulty).toBeNull();
  });

  it("keeps the miss count after a reload so the score stays 5 or 2", () => {
    const saved = parseState(
      JSON.stringify({
        ...createState("child", "judah"),
        progress: {
          ...emptyProgress(),
          openAttempt: { questionId: "c1-gen-0001", missCount: 1, phase: "teaching" },
          missCounts: { "c1-gen-0001": 1 },
        },
      }),
    );
    const resumed = attemptForQuestion("c1-gen-0001", saved!.progress);
    expect(resumed.missCount).toBe(1);
    expect(resumed.phase).toBe("teaching");
    expect(attemptPoints(resumed.missCount, false, false)).toBe(5);
    const fromMissesOnly = attemptForQuestion("c1-gen-0001", {
      ...emptyProgress(),
      missCounts: { "c1-gen-0001": 2 },
    });
    expect(fromMissesOnly.missCount).toBe(2);
    expect(attemptPoints(fromMissesOnly.missCount, false, false)).toBe(2);
    expect(attemptForQuestion("other", saved!.progress).missCount).toBe(0);
  });
});
