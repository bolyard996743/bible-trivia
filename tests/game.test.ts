import { describe, expect, it } from "vitest";
import {
  acknowledgeTeaching,
  applyMastery,
  explanationRevealIssues,
  orderChoicesForRetry,
  shuffleChoices,
  textContainsChoice,
  emptyProgress,
  knowledgeStage,
  mascotLineAudioSrc,
  nextQuestion,
  pickMascotLine,
  pickWording,
  placementFromRatio,
  scorePlacement,
  selectPlacementQuestions,
  shouldShowExtended,
  shouldShowTakeaway,
  startAttempt,
  submitAnswer,
  wasFirstAttempt,
} from "@/lib/game";
import type { MascotLine, Question, Tier } from "@/lib/game/types";

function question(overrides: Partial<Question> & Pick<Question, "id" | "section" | "tier" | "cycle" | "book">): Question {
  return {
    testament: "OT",
    topics: ["sample"],
    placement_eligible: true,
    type: "multiple_choice",
    prompt: { adult: "Prompt?" },
    choices: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
    answer: "a",
    teaching: {
      verses: [
        {
          ref: "Genesis 1:1",
          text: "In the beginning God created the heavens and the earth.",
          translation: "NKJV",
        },
      ],
      explanation: { adult: "Adult explanation." },
      takeaway: "Takeaway.",
    },
    review: { status: "draft", notes: "" },
    ...overrides,
  };
}

describe("pickWording", () => {
  const wording = {
    adult: "Adult line",
    child: "Child line",
    teen: "Teen line",
  };

  it("uses the player's wording when it exists", () => {
    expect(pickWording(wording, "child")).toBe("Child line");
    expect(pickWording(wording, "teen")).toBe("Teen line");
    expect(pickWording(wording, "adult")).toBe("Adult line");
  });

  it("falls back to adult", () => {
    expect(pickWording(wording, "older")).toBe("Adult line");
    expect(pickWording({ adult: "Only adult", child: "  " }, "child")).toBe("Only adult");
  });
});

describe("pickMascotLine", () => {
  const lines: MascotLine[] = [
    {
      id: "all",
      mascot: "judah",
      moment: "wrong_intro",
      audience: "all",
      text: "General",
      audio_file: null,
      question_id: null,
    },
    {
      id: "child",
      mascot: "judah",
      moment: "wrong_intro",
      audience: "child",
      text: "For a child",
      audio_file: null,
      question_id: null,
    },
    {
      id: "specific",
      mascot: "judah",
      moment: "wrong_intro",
      audience: "all",
      text: "For this question",
      audio_file: null,
      question_id: "c1-exo-0001",
    },
    {
      id: "other",
      mascot: "agnes",
      moment: "wrong_intro",
      audience: "all",
      text: "Agnes",
      audio_file: null,
      question_id: null,
    },
  ];

  it("prefers the age group and falls back to all", () => {
    expect(pickMascotLine(lines, "judah", "wrong_intro", "child", { random: () => 0 })?.text).toBe(
      "For a child",
    );
    expect(pickMascotLine(lines, "judah", "wrong_intro", "older", { random: () => 0 })?.text).toBe(
      "General",
    );
  });

  it("prefers a line tied to the question", () => {
    expect(
      pickMascotLine(lines, "judah", "wrong_intro", "child", {
        questionId: "c1-exo-0001",
        random: () => 0,
      })?.id,
    ).toBe("specific");
  });

  it("builds a voiceover path and keeps a declared file", () => {
    expect(mascotLineAudioSrc("judah", { id: "judah-wrong-001", audio_file: null })).toBe(
      "/audio/judah/judah-wrong-001.mp3",
    );
    expect(mascotLineAudioSrc("judah", { id: "x", audio_file: "audio/judah/x.mp3" })).toBe(
      "/audio/judah/x.mp3",
    );
  });
});

describe("mastery gate", () => {
  it("teaches and re-asks until the answer is correct", () => {
    let state = startAttempt("c1-gen-0001");
    state = submitAnswer(state, false);
    expect(state.phase).toBe("teaching");
    expect(state.missCount).toBe(1);
    expect(shouldShowExtended(state.missCount)).toBe(false);

    state = acknowledgeTeaching(state);
    expect(state.phase).toBe("asking");
    expect(state.questionId).toBe("c1-gen-0001");

    state = submitAnswer(state, false);
    expect(shouldShowExtended(state.missCount)).toBe(true);

    state = acknowledgeTeaching(state);
    state = submitAnswer(state, true);
    expect(state.phase).toBe("mastered");
    expect(wasFirstAttempt(state)).toBe(false);
    expect(shouldShowTakeaway(state)).toBe(true);
  });

  it("skips the takeaway on a first-try correct answer", () => {
    const state = submitAnswer(startAttempt("q"), true);
    expect(wasFirstAttempt(state)).toBe(true);
    expect(shouldShowTakeaway(state)).toBe(false);
  });
});

describe("placement", () => {
  it("maps score ratios onto a starting cycle and tier", () => {
    expect(placementFromRatio(0)).toEqual({ cycle: 1, tier: "foundation" });
    expect(placementFromRatio(0.2)).toEqual({ cycle: 1, tier: "intermediate" });
    expect(placementFromRatio(0.4)).toEqual({ cycle: 1, tier: "advanced" });
    expect(placementFromRatio(0.55)).toEqual({ cycle: 1, tier: "expert" });
    expect(placementFromRatio(0.7)).toEqual({ cycle: 2, tier: "foundation" });
    expect(placementFromRatio(0.85)).toEqual({ cycle: 2, tier: "intermediate" });
    expect(placementFromRatio(1)).toEqual({ cycle: 2, tier: "advanced" });
  });

  it("weights harder tiers and ignores retries", () => {
    const result = scorePlacement([
      { questionId: "a", tier: "foundation", firstAttemptCorrect: true },
      { questionId: "b", tier: "expert", firstAttemptCorrect: false },
    ]);
    expect(result.earned).toBe(1);
    expect(result.possible).toBe(5);
    expect(result.ratio).toBeCloseTo(0.2);
    expect(result.tier).toBe("intermediate");
    expect(result.stage).toBe("Sprout");
  });

  it("gives an empty quiz a gentle start", () => {
    const result = scorePlacement([]);
    expect(result).toMatchObject({ cycle: 1, tier: "foundation", stage: "Seed", ratio: 0 });
  });
});

describe("progression", () => {
  const bank = [
    question({ id: "gen-1", book: "Genesis", section: "Genesis 1-11", cycle: 1, tier: "foundation" }),
    question({ id: "gen-2", book: "Genesis", section: "Genesis 1-11", cycle: 1, tier: "foundation" }),
    question({ id: "exo-1", book: "Exodus", section: "Exodus 1-15", cycle: 1, tier: "foundation" }),
    question({ id: "mat-1", book: "Matthew", section: "Matthew 14", cycle: 1, tier: "intermediate" }),
    question({ id: "jon-1", book: "Jonah", section: "Jonah 1", cycle: 2, tier: "foundation" }),
  ];

  it("names the path from cycle and tier only", () => {
    const stages: [number, Tier, string][] = [
      [1, "foundation", "Seed"],
      [1, "intermediate", "Sprout"],
      [1, "advanced", "Rooted"],
      [1, "expert", "Growing"],
      [2, "foundation", "Established"],
      [2, "intermediate", "Fruitful"],
      [2, "advanced", "Deep Roots"],
      [3, "foundation", "Deep Roots"],
    ];
    for (const [cycle, tier, stage] of stages) {
      expect(knowledgeStage(cycle, tier)).toBe(stage);
    }
    expect(knowledgeStage(1, "foundation")).toBe(knowledgeStage(1, "foundation"));
  });

  it("keeps season totals off the Knowledge Path", () => {
    const low = emptyProgress(2, "intermediate");
    const high = { ...low, seasonMasteredCount: 40, streak: 9 };
    expect(knowledgeStage(low.cycle, low.tier)).toBe("Fruitful");
    expect(knowledgeStage(high.cycle, high.tier)).toBe(knowledgeStage(low.cycle, low.tier));
  });

  it("resets the streak after a miss and advances a finished section", () => {
    let progress = emptyProgress();
    expect(nextQuestion(bank, progress)?.id).toBe("gen-1");

    let step = applyMastery(bank, progress, "gen-1", true);
    progress = step.progress;
    expect(step.event.type).toBe("mastered");
    expect(progress.streak).toBe(1);
    expect(progress.seasonMasteredCount).toBe(1);

    step = applyMastery(bank, progress, "gen-2", false);
    progress = step.progress;
    expect(step.event).toEqual({ type: "section_complete", section: "Genesis 1-11" });
    expect(progress.streak).toBe(0);
    expect(progress.cycle).toBe(1);
    expect(progress.tier).toBe("foundation");
    expect(nextQuestion(bank, progress)?.id).toBe("exo-1");
  });

  it("levels up when a tier is finished and cycles up when the next content is a new cycle", () => {
    let progress = {
      ...emptyProgress(),
      masteredIds: ["gen-1", "gen-2"],
    };
    let step = applyMastery(bank, progress, "exo-1", true);
    progress = step.progress;
    expect(step.event).toEqual({
      type: "level_up",
      from: { cycle: 1, tier: "foundation" },
      to: { cycle: 1, tier: "intermediate" },
    });
    expect(progress.tier).toBe("intermediate");
    expect(knowledgeStage(progress.cycle, progress.tier)).toBe("Sprout");

    step = applyMastery(bank, progress, "mat-1", true);
    expect(step.event.type).toBe("cycle_complete");
    expect(step.progress.cycle).toBe(2);
    expect(step.progress.tier).toBe("foundation");
    expect(step.progress.seasonMasteredCount).toBe(2);
  });

  it("stops kindly when no further questions exist", () => {
    const only = [question({ id: "only", book: "Genesis", section: "Genesis 1-11", cycle: 1, tier: "foundation" })];
    const step = applyMastery(only, emptyProgress(), "only", true);
    expect(step.event.type).toBe("caught_up");
    expect(step.progress.cycle).toBe(1);
    expect(nextQuestion(only, step.progress)).toBeNull();
  });
});

describe("answer privacy", () => {
  it("treats the choice text as revealed only when the wording contains it", () => {
    expect(textContainsChoice("Look at Genesis 1:1 and find the name.", "God")).toBe(false);
    expect(textContainsChoice("The answer is God.", "God")).toBe(true);
    expect(textContainsChoice("Count the plagues in Exodus.", "10")).toBe(false);
  });

  it("flags an explanation that states the correct choice", () => {
    const sample = question({
      id: "sample",
      book: "Genesis",
      section: "Genesis 1-11",
      cycle: 1,
      tier: "foundation",
      answer: "b",
      choices: [
        { id: "a", text: "Adam" },
        { id: "b", text: "God" },
        { id: "c", text: "The angels" },
        { id: "d", text: "Noah" },
      ],
      teaching: {
        verses: [
          {
            ref: "Genesis 1:1",
            text: "In the beginning God created the heavens and the earth.",
            translation: "NKJV",
          },
        ],
        explanation: { adult: "The correct answer is God." },
        extended_explanation: "Scripture answers with one name: God.",
        takeaway: "God created the heavens and the earth.",
      },
    });
    const issues = explanationRevealIssues(sample);
    expect(issues.some((issue) => issue.includes("explanation.adult"))).toBe(true);
    expect(issues.some((issue) => issue.includes("extended_explanation"))).toBe(true);
  });
});

describe("retry choice order", () => {
  const choices = [
    { id: "a", text: "Adam" },
    { id: "b", text: "God" },
    { id: "c", text: "The angels" },
    { id: "d", text: "Noah" },
  ];

  it("shuffles by the injected random source and keeps each id with its text", () => {
    const shuffled = shuffleChoices(choices, () => 0);
    expect(shuffled.map((choice) => choice.id)).toEqual(["b", "c", "d", "a"]);
    expect(shuffled.find((choice) => choice.id === "b")?.text).toBe("God");
  });

  it("changes the order when the question is asked again", () => {
    const again = orderChoicesForRetry(choices, "c1-gen-0001:1");
    expect(again.map((choice) => choice.id)).not.toEqual(choices.map((choice) => choice.id));
    expect(again.map((choice) => choice.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("selectPlacementQuestions", () => {
  it("asks for a stable set of 8 to 12 questions", () => {
    const questions = ["foundation", "intermediate", "advanced", "expert"].flatMap((tier, tierIndex) =>
      ["OT", "NT"].map((testament, testamentIndex) =>
        question({
          id: `${tier}-${testament}`,
          book: testament === "OT" ? "Genesis" : "John",
          section: testament,
          cycle: 1,
          tier: tier as Tier,
          testament: testament as "OT" | "NT",
          placement_eligible: true,
        }) &&
        question({
          id: `${tier}-${testament}-${tierIndex}-${testamentIndex}`,
          book: testament === "OT" ? "Genesis" : "John",
          section: "S",
          cycle: 1,
          tier: tier as Tier,
          testament: testament as "OT" | "NT",
        }),
      ),
    );
    const picked = selectPlacementQuestions(questions, 10);
    expect(picked.length).toBeGreaterThanOrEqual(8);
    expect(picked.length).toBeLessThanOrEqual(12);
    expect(new Set(picked.map((item) => item.testament)).size).toBe(2);
  });
});
