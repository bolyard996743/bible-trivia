// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DailyMissPanel } from "@/components/DailyChallengeClient";
import { MascotMark } from "@/components/MascotMark";
import { StageUpCelebration } from "@/components/StageUpCelebration";
import { StreakFlame } from "@/components/StreakFlame";
import { weeklyBoardUrl } from "@/lib/account/leaderboard";
import { sameLeaderboardWeek, weekStartLosAngeles } from "@/lib/account/week";
import { loadCatalog } from "@/lib/content/load";
import { stageRank } from "@/lib/curriculum";
import { gradeDailyChallengeAction, openDailyChallengeAction } from "@/app/daily/actions";
import { countCatalogBadges, countEarnedBadges } from "@/lib/game/badges";
import {
  DAILY_MISS_HEADING,
  DAILY_MISS_NOTE,
  finishDailyChallenge,
  gradeDailyChoice,
  selectDailyQuestion,
  toDailyAsk,
} from "@/lib/game/daily-challenge";
import { knowledgePath } from "@/lib/game/path";
import { stageForQuestion } from "@/lib/game/question-stage";
import { stageVerse } from "@/lib/game/stage-verse";
import { emptyProgress } from "@/lib/game/progression";
import { KNOWLEDGE_PATH, MASCOT_IDS, type KnowledgeStage, type Question } from "@/lib/game/types";
import {
  applyPlayedDay,
  dailyFlameScale,
  shouldWelcomeBack,
  visibleDailyStreak,
  WELCOME_BACK,
} from "@/lib/play/daily-streak";
import { MASCOT_CELEBRATION } from "@/lib/play/mascot-celebration";
import { presentBadgeShare, shareCardLine, drawBadgeShareCard, type ShareCardCanvas } from "@/lib/share/badge-card";
import { createState, parseState } from "@/lib/storage";

function question(id: string, stage: KnowledgeStage, answer = "a"): Question {
  return {
    id,
    cycle: 1,
    tier: "foundation",
    stage,
    testament: "OT",
    book: "Genesis",
    section: "Creation",
    topics: ["creation"],
    placement_eligible: false,
    type: "multiple_choice",
    prompt: { adult: "A sample prompt" },
    choices: [
      { id: "a", text: "Alpha Unique Choice" },
      { id: "b", text: "Beta Other Choice" },
    ],
    answer,
    teaching: {
      verses: [{ ref: "John 11:35", text: "", translation: "NKJV" }],
      explanation: { adult: "The verse is worth reading." },
      takeaway: "Keep reading.",
    },
    review: { status: "approved", notes: "" },
  };
}

describe("daily play streak", () => {
  it("grows across consecutive days and welcomes a player back without scolding", () => {
    let record = applyPlayedDay(undefined, "2026-11-24");
    record = applyPlayedDay(record, "2026-11-25");
    record = applyPlayedDay(record, "2026-11-26");
    expect(record.streak).toBe(3);
    expect(record.welcomeOn).toBeNull();
    expect(shouldWelcomeBack(record, "2026-11-26")).toBe(false);
    expect(visibleDailyStreak(record, "2026-11-26")).toBe(3);
    expect(applyPlayedDay(record, "2026-11-26")).toBe(record);

    const paused = { lastPlayedOn: "2026-11-20", streak: 4, best: 4, welcomeOn: null };
    expect(shouldWelcomeBack(paused, "2026-11-26")).toBe(true);
    expect(visibleDailyStreak(paused, "2026-11-26")).toBe(0);
    const returned = applyPlayedDay(paused, "2026-11-26");
    expect(returned.streak).toBe(1);
    expect(returned.best).toBe(4);
    expect(returned.welcomeOn).toBe("2026-11-26");
    expect(shouldWelcomeBack(returned, "2026-11-26")).toBe(true);
    expect(WELCOME_BACK).toBe("Welcome back");
    expect(WELCOME_BACK.toLowerCase()).not.toMatch(/broke|broken|lost|shame|failed/);

    expect(dailyFlameScale(1)).toBe(1);
    expect(dailyFlameScale(5)).toBeGreaterThan(dailyFlameScale(1));
    expect(dailyFlameScale(40)).toBe(dailyFlameScale(9));
  });

  it("reuses the streak flame and lets it grow", () => {
    const html = renderToStaticMarkup(createElement(StreakFlame, { count: 5, grow: true }));
    expect(html).toContain('data-testid="daily-streak"');
    expect(html).toContain('data-scale="1.40"');
    expect(html).toContain("days");
    expect(html).toContain("5 days in a row");
    expect(html).not.toMatch(/broke|broken|lost|shame/i);
    const quiet = renderToStaticMarkup(createElement(StreakFlame, { count: 2 }));
    expect(quiet).toContain('data-testid="attempt-streak"');
    expect(quiet).toContain("2 correct in a row");
    expect(renderToStaticMarkup(createElement(StreakFlame, { count: 0, grow: true }))).toBe("");
    const one = renderToStaticMarkup(createElement(StreakFlame, { count: 1, grow: true }));
    expect(one).toContain("1 day in a row");
    expect(one).not.toContain("days");
  });

  it("keeps a guest streak in device storage", () => {
    const state = createState("adult", "judah");
    state.dailyPlay = applyPlayedDay(undefined, "2026-11-26");
    const parsed = parseState(JSON.stringify(state));
    expect(parsed?.dailyPlay).toEqual(state.dailyPlay);
  });
});

describe("daily challenge exclusions", () => {
  const catalog = loadCatalog().questions;

  it("draws only from stages already reached and ignores a requested later id", () => {
    const late = question("later-stage", "Fruitful");
    const early = question("reached-stage", "Seed");
    expect(selectDailyQuestion([late], "Seed", "2026-11-26")).toBeNull();
    expect(selectDailyQuestion([early, late], "Seed", "2026-11-26", knowledgePath, late.id)?.id).toBe("reached-stage");
    expect(selectDailyQuestion([early, late], "Seed", "2026-11-26")?.id).toBe(
      selectDailyQuestion([early, late], "Seed", "2026-11-26")?.id,
    );

    const deep = knowledgePath.stages.find((stage) => stage.stage === "Deep Roots");
    const deepId = deep?.badges.find((badge) => badge.questionIds.length > 0)?.questionIds[0] ?? "";
    expect(deepId.length).toBeGreaterThan(0);
    for (let day = 1; day <= 28; day += 1) {
      const key = `2026-11-${String(day).padStart(2, "0")}`;
      const picked = selectDailyQuestion(catalog, "Seed", key, knowledgePath, deepId);
      expect(picked).not.toBeNull();
      expect(stageRank(stageForQuestion(picked!))).toBeLessThanOrEqual(stageRank("Seed"));
      expect(picked!.id).not.toBe(deepId);
    }
    const sprout = selectDailyQuestion(catalog, "Sprout", "2026-11-26");
    expect(sprout).not.toBeNull();
    expect(stageRank(stageForQuestion(sprout!))).toBeLessThanOrEqual(stageRank("Sprout"));
  });

  it("never returns the answer after a miss and leaves the path, points, and 24-hour lock alone", async () => {
    const sample = question("daily-sample", "Seed", "a");
    const ask = toDailyAsk(sample, "adult");
    expect(ask).not.toHaveProperty("answer");
    const missed = gradeDailyChoice(sample, "b");
    expect(missed.correct).toBe(false);
    expect(Object.keys(missed).sort()).toEqual(["correct", "refs"]);
    expect(JSON.stringify(missed)).not.toContain("Alpha Unique Choice");
    expect(JSON.stringify(missed)).not.toContain('"a"');

    const progress = {
      ...emptyProgress(),
      stage: "Seed" as const,
      points: 4,
      masteredIds: ["already"],
      badgeRetries: { "seed-creation": { correctIds: [] as string[], retryAt: "2099-01-01T00:00:00.000Z" } },
    };
    const state = { ...createState("teen", "shalom"), placementComplete: true, progress };
    const earnedBefore = countEarnedBadges(progress);
    expect(countCatalogBadges()).toBe(218);
    const done = finishDailyChallenge(state, {
      day: "2026-11-26",
      questionId: sample.id,
      correct: false,
      refs: ["John 11:35"],
    });
    expect(done.progress).toEqual(progress);
    expect(done.progress.badgeRetries).toEqual(progress.badgeRetries);
    expect(done.progress.stage).toBe("Seed");
    expect(done.progress.points).toBe(4);
    expect(done.progress.masteredIds).toEqual(["already"]);
    expect(countEarnedBadges(done.progress)).toBe(earnedBefore);
    expect(done.dailyBadges).toBeUndefined();
    expect(done.dailyChallenge).toEqual({ day: "2026-11-26", questionId: sample.id, correct: false, refs: ["John 11:35"] });
    expect(finishDailyChallenge(done, { day: "2026-11-26", questionId: "other", correct: true, refs: ["John 1:1"] })).toBe(done);

    const correct = finishDailyChallenge(state, {
      day: "2026-11-26",
      questionId: sample.id,
      correct: true,
      refs: ["John 11:35"],
    });
    expect(correct.progress).toEqual(progress);
    expect(countEarnedBadges(correct.progress)).toBe(earnedBefore);
    expect(correct.dailyBadges).toEqual([{ day: "2026-11-26", ref: "John 11:35" }]);

    const opened = await openDailyChallengeAction({ ...emptyProgress(), stage: "Seed" }, "2026-11-26", "adult");
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;
    expect(opened.ask).not.toHaveProperty("answer");
    const live = catalog.find((item) => item.id === opened.ask.id);
    expect(live).toBeTruthy();
    const correctText = live!.choices.find((choice) => choice.id === live!.answer)?.text ?? "";
    const wrong = opened.ask.choices.find((choice) => choice.id !== live!.answer);
    expect(wrong).toBeTruthy();
    const graded = await gradeDailyChallengeAction({ ...emptyProgress(), stage: "Seed" }, "2026-11-26", opened.ask.id, wrong!.id);
    expect(graded?.correct).toBe(false);
    expect(JSON.stringify(graded)).not.toContain(correctText);
    const deep = knowledgePath.stages.find((stage) => stage.stage === "Deep Roots");
    const deepId = deep?.badges.find((badge) => badge.questionIds.length > 0)?.questionIds[0] ?? "missing";
    expect(await gradeDailyChallengeAction({ ...emptyProgress(), stage: "Seed" }, "2026-11-26", deepId, "a")).toBeNull();

    const html = renderToStaticMarkup(createElement(DailyMissPanel, { refs: ["John 11:35"] }));
    expect(html).toContain(DAILY_MISS_HEADING);
    expect(html).toContain(DAILY_MISS_NOTE);
    expect(html).toContain("John 11:35");
    expect(html).not.toContain("Alpha Unique Choice");
    expect(html).not.toContain("choice-");
    expect(html.toLowerCase()).not.toMatch(/the answer is|correct answer|you missed|wrong/);
  });
});

describe("weekly reset in America/Los_Angeles", () => {
  it("starts a new week at Monday 00:00 and keeps the previous instant on the old week", () => {
    const monday = new Date("2026-11-02T08:00:00.000Z");
    const justBefore = new Date("2026-11-02T07:59:59.999Z");
    expect(weekStartLosAngeles(monday).toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect(weekStartLosAngeles(justBefore).toISOString()).toBe("2026-10-26T07:00:00.000Z");
    expect(sameLeaderboardWeek(monday, justBefore)).toBe(false);
    expect(sameLeaderboardWeek(monday, new Date("2026-11-09T07:59:59.999Z"))).toBe(true);
    expect(sameLeaderboardWeek(monday, new Date("2026-11-09T08:00:00.000Z"))).toBe(false);

    expect(weekStartLosAngeles(new Date("2026-06-01T07:00:00.000Z")).toISOString()).toBe("2026-06-01T07:00:00.000Z");
    expect(weekStartLosAngeles(new Date("2026-06-01T06:59:59.999Z")).toISOString()).toBe("2026-05-25T07:00:00.000Z");
    expect(weekStartLosAngeles(new Date("2026-03-09T07:00:00.000Z")).toISOString()).toBe("2026-03-09T07:00:00.000Z");
    expect(weekStartLosAngeles(new Date("2026-03-09T06:59:59.999Z")).toISOString()).toBe("2026-03-02T08:00:00.000Z");
    expect(weeklyBoardUrl("https://example.test")).toBe("https://example.test/rest/v1/rpc/leaderboard_weekly_top");
  });
});

describe("mascot celebrations and stage-up", () => {
  it("gives each guide a short motion and keeps later stages off the celebration", () => {
    expect(MASCOT_CELEBRATION).toEqual({
      judah: "mascot-roar",
      shalom: "mascot-flutter",
      hunter: "mascot-splash",
      agnes: "mascot-hop",
      zion: "mascot-soar",
    });
    for (const id of MASCOT_IDS) {
      const html = renderToStaticMarkup(createElement(MascotMark, { mascot: id, motion: "celebrate" }));
      expect(html).toContain(MASCOT_CELEBRATION[id]);
      expect(html).toContain(`data-celebration="${id}"`);
    }
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    for (const name of Object.values(MASCOT_CELEBRATION)) expect(css).toContain(name);
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain(".mascot-flourish");
    expect(css).not.toContain("15s");

    const screen = renderToStaticMarkup(
      createElement(StageUpCelebration, {
        mascot: "agnes",
        stage: "Sprout",
        verseRef: "John 11:35",
        onContinue: () => undefined,
      }),
    );
    expect(screen).toContain("Sprout is open");
    expect(screen).toContain("John 11:35");
    expect(screen).toContain("mascot-hop");
    expect(screen.toLowerCase()).not.toMatch(/\b(difficulty|easy|intermediate|advanced|expert|age|fruitful|deep roots)\b/);

    const { questions } = loadCatalog();
    for (const stage of KNOWLEDGE_PATH) {
      const verse = stageVerse(questions, stage);
      expect(verse).not.toBeNull();
      const owner = questions.find((item) => item.id === verse?.id);
      expect(stageForQuestion(owner!)).toBe(stage);
    }
  });
});

describe("share card", () => {
  it("draws the badge line and the brand, and shares a file or downloads it", async () => {
    expect(shareCardLine("Creation")).toBe("I earned the Creation badge!");
    const texts: string[] = [];
    const ctx: ShareCardCanvas = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      stroke() {},
      fillText(text) {
        texts.push(text);
      },
      measureText(text) {
        return { width: text.length * 20 };
      },
    };
    drawBadgeShareCard(ctx, { name: "Creation", width: 720, height: 960 });
    expect(texts).toContain("Noble Bereans");
    expect(texts.join(" ")).toContain("I earned the Creation badge!");
    expect(texts.join(" ")).not.toContain("Alpha Unique Choice");

    const file = new File(["png"], "noble-bereans-badge.png", { type: "image/png" });
    const shared = await presentBadgeShare({
      file,
      text: shareCardLine("Creation"),
      canShare: () => true,
      share: async () => undefined,
      download: () => {
        throw new Error("should not download");
      },
    });
    expect(shared).toBe("shared");
    let downloaded = false;
    const saved = await presentBadgeShare({
      file,
      text: shareCardLine("Creation"),
      canShare: () => false,
      share: async () => {
        throw new Error("no sheet");
      },
      download: () => {
        downloaded = true;
      },
    });
    expect(saved).toBe("downloaded");
    expect(downloaded).toBe(true);
    const dismissed = await presentBadgeShare({
      file,
      text: shareCardLine("Creation"),
      canShare: () => true,
      share: async () => {
        const error = new Error("closed");
        error.name = "AbortError";
        throw error;
      },
      download: () => {
        downloaded = false;
      },
    });
    expect(dismissed).toBe("dismissed");
    expect(downloaded).toBe(true);
  });
});

describe("weekly board migration", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261126120000_daily_play_and_weekly_board.sql"),
    "utf8",
  );

  it("uses date_part, locks rows to their owner, and keeps the weekly board public columns only", () => {
    expect(sql).toContain("pg_catalog.date_part");
    expect(sql.toLowerCase()).not.toContain("extract(");
    expect(sql).toContain("America/Los_Angeles");
    expect(sql).toContain("leaderboard_weekly_top");
    expect(sql).toContain("alter table public.daily_plays enable row level security");
    for (const action of ["select", "insert", "update", "delete"]) {
      expect(sql).toContain(`daily_plays_${action}_own`);
    }
    const policies = sql.match(/create policy daily_plays_[\s\S]*?;/g) ?? [];
    expect(policies).toHaveLength(4);
    for (const policy of policies) expect(policy).toContain("(select auth.uid()) = user_id");
    expect(sql).toContain("with check ((select auth.uid()) = user_id)");
    const weekly = sql.slice(sql.indexOf("function public.leaderboard_weekly_top"));
    expect(weekly).toContain("username text, points integer, rank bigint");
    expect(weekly).not.toContain("birth_date");
    expect(weekly).not.toContain("email");
    expect(sql).toContain("awarded_at");
    expect(sql).not.toContain("grant insert on table public.question_awards");
    expect(sql).toContain("references auth.users (id) on delete cascade");
  });
});
