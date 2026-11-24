import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { accountModeHref } from "@/lib/account/account-mode";
import {
  beginShouldOfferPlayChoice,
  clearPendingPlayChoice,
  hasChosenLocalPlay,
  loadPendingPlayChoice,
  LOCAL_PLAY_KEY,
  markLocalPlay,
  PENDING_PLAY_CHOICE_KEY,
  savePendingPlayChoice,
} from "@/lib/account/age-gate";
import { loadCatalog } from "@/lib/content/load";
import {
  badgeCircleName,
  badgeProgressLabel,
  choicesForBadgeAsk,
  questionsForBadgeRun,
  selectBadgeQuestion,
  visibleMapStages,
} from "@/lib/game/badges";
import { BADGE_RETRY_MS, recordBadgeAnswer } from "@/lib/game/badge-retry";
import { knowledgePath } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

const LIVE: KnowledgeStage[] = ["Seed", "Sprout", "Rooted", "Growing", "Established"];
const NOW = new Date("2026-11-03T18:00:00.000Z");

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("stage lists stop at the stage a player has reached", () => {
  it("reuses the path map for home and results", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "src/components/HomeClient.tsx"), "utf8");
    const results = fs.readFileSync(path.join(process.cwd(), "src/components/ResultsClient.tsx"), "utf8");
    const pathList = fs.readFileSync(path.join(process.cwd(), "src/components/KnowledgePath.tsx"), "utf8");
    expect(home).toContain("<KnowledgePath");
    expect(results).toContain("<KnowledgePath");
    expect(pathList).toContain("visibleMapStages");
    expect(pathList).not.toContain("KNOWLEDGE_PATH");
    expect(visibleMapStages({ stage: "Seed" })).toEqual(["Seed"]);
    expect(visibleMapStages({ stage: "Established" })).toEqual(["Seed", "Sprout", "Rooted", "Growing", "Established"]);
    expect(visibleMapStages({ stage: "Established" })).not.toContain("Fruitful");
    expect(visibleMapStages({ stage: "Established" })).not.toContain("Deep Roots");
  });
});

describe("badge header uses the badge stage", () => {
  it("does not name a later stage on an earlier badge", () => {
    expect(badgeProgressLabel("seed-creation", "Genesis 2")).toBe("Seed · Genesis 2");
    expect(badgeProgressLabel("seed-creation", "Genesis 2")).not.toContain("Established");
    expect(badgeCircleName("Creation", false)).toBe("Creation, not earned yet");
    expect(badgeCircleName("Creation", true)).toBe("Creation, earned");
  });
});

describe("live badge runs", () => {
  const { questions } = loadCatalog();

  function walk(progress: GameProgress, badgeId: string, now = NOW) {
    const badge = knowledgePath.stages.flatMap((stage) => stage.badges).find((item) => item.id === badgeId);
    if (!badge) throw new Error(badgeId);
    const run = questionsForBadgeRun(questions, badge);
    let state = progress;
    const served = [];
    for (let step = 0; step < badge.questionIds.length + 2; step += 1) {
      const next = selectBadgeQuestion(run, state, badge, now);
      if (!next) break;
      served.push(next);
      state = recordBadgeAnswer(state, badge, next.id, true, now);
    }
    return { badge, run, served };
  }

  it("serves 8 questions with 4 choices for every live badge", () => {
    const live = knowledgePath.stages.filter((stage) => LIVE.includes(stage.stage));
    expect(live.map((stage) => stage.stage)).toEqual(LIVE);
    let badges = 0;
    for (const stage of live) {
      for (const badge of stage.badges) {
        badges += 1;
        const { run, served } = walk({ ...emptyProgress(), stage: stage.stage }, badge.id);
        expect(run.map((question) => question.id)).toEqual(badge.questionIds);
        expect(served.map((question) => question.id)).toEqual(badge.questionIds);
        for (const question of served) {
          expect(choicesForBadgeAsk(question)).toHaveLength(4);
          expect(new Set(question.choices.map((choice) => choice.id)).size).toBe(4);
        }
      }
    }
    expect(badges).toBe(9 + 17 + 25 + 27 + 29);
  });

  it("keeps seed creation across both sections and the sprout intermediate question", () => {
    const creation = walk(emptyProgress(), "seed-creation");
    const sections = new Set(creation.served.map((question) => question.section));
    expect(sections.has("Genesis 1")).toBe(true);
    expect(sections.has("Genesis 2")).toBe(true);
    expect(creation.served).toHaveLength(8);

    const news = walk(emptyProgress(), "sprout-good-news");
    const intermediate = news.served.find((question) => question.id === "c1-rom-0007");
    expect(intermediate?.tier).toBe("intermediate");
    expect(intermediate?.choices).toHaveLength(4);
    expect(news.served).toHaveLength(8);
  });

  it("does not drop questions already mastered, placed, or missed", () => {
    const badge = knowledgePath.stages[0]?.badges.find((item) => item.id === "seed-creation");
    if (!badge) throw new Error("seed-creation");
    const half = badge.questionIds.slice(0, 4);
    const progress: GameProgress = {
      ...emptyProgress(2, "expert"),
      stage: "Established",
      masteredIds: half,
      placementIds: half.slice(0, 2),
      firstTryIds: half,
      missCounts: Object.fromEntries(badge.questionIds.map((id) => [id, 3])),
      openAttempt: { questionId: "not-this-badge", missCount: 2, phase: "asking" },
    };
    const { served } = walk(progress, "seed-creation");
    expect(served.map((question) => question.id)).toEqual(badge.questionIds);
    for (const question of served) expect(question.choices).toHaveLength(4);
  });

  it("starts the whole badge over after any miss, including ones that followed correct answers", () => {
    const badge = knowledgePath.stages[0]?.badges.find((item) => item.id === "seed-creation");
    if (!badge) throw new Error("seed-creation");
    let progress = emptyProgress();
    for (const id of badge.questionIds.slice(0, 3)) {
      progress = recordBadgeAnswer(progress, badge, id, true, NOW);
    }
    progress = recordBadgeAnswer(progress, badge, badge.questionIds[3] ?? "", false, NOW);
    expect(selectBadgeQuestion(questions, progress, badge, NOW)).toBeNull();
    const later = new Date(NOW.getTime() + BADGE_RETRY_MS);
    const { served } = walk(progress, "seed-creation", later);
    expect(served).toHaveLength(8);
    expect(served.map((question) => question.id)).toEqual(badge.questionIds);
  });
});

describe("begin and the account url", () => {
  it("still offers play without an account when a reload has not chosen local play", () => {
    expect(
      beginShouldOfferPlayChoice({ under13: false, hasProfile: false, signedIn: false, localPlay: false }),
    ).toBe(true);
    expect(
      beginShouldOfferPlayChoice({ under13: false, hasProfile: false, signedIn: false, localPlay: true }),
    ).toBe(false);
    expect(
      beginShouldOfferPlayChoice({ under13: true, hasProfile: false, signedIn: false, localPlay: false }),
    ).toBe(false);
    expect(accountModeHref("/account", "?mode=sign-up", "sign-in")).toBe("/account?mode=sign-in");
    expect(accountModeHref("/account", "", "reset")).toBe("/account?mode=reset");
  });

  it("restores the unfinished play choice after a reload", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage, sessionStorage: storage });
    savePendingPlayChoice({ year: 1990, month: 4, day: 2 });
    expect(loadPendingPlayChoice()).toEqual({ year: 1990, month: 4, day: 2 });
    expect(hasChosenLocalPlay()).toBe(false);
    markLocalPlay();
    expect(hasChosenLocalPlay()).toBe(true);
    expect(loadPendingPlayChoice()).toBeNull();
    expect(storage.getItem(LOCAL_PLAY_KEY)).toBe("1");
    expect(storage.getItem(PENDING_PLAY_CHOICE_KEY)).toBeNull();
    clearPendingPlayChoice();
    vi.unstubAllGlobals();
  });
});
