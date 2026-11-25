import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { StageMap } from "@/components/StageMap";
import { loadCatalog } from "@/lib/content/load";
import { badgeEarned, mapStageRows, openBadgeRun, selectBadgeQuestion } from "@/lib/game/badges";
import { BADGE_AHEAD_NOTE } from "@/lib/game/badge-lock";
import { recordBadgeAnswer } from "@/lib/game/badge-retry";
import { findPathBadge } from "@/lib/game/path";
import { citedSectionLabel } from "@/lib/game/section-label";
import { badgeEarnedMessage } from "@/components/BadgeEarnedDialog";
import { matchTypography } from "@/lib/game/typography";
import { emptyProgress } from "@/lib/game/progression";
import { selectLadderQuestion } from "@/lib/game/ladder";

const STAGE_WORDS = /\b(seed|sprout|rooted|growing|established|fruitful|deep roots|easy|intermediate|advanced|expert|foundation|age|difficulty)\b/i;

describe("locked badges do not serve questions", () => {
  const { questions } = loadCatalog();
  const lockedIds = ["fruitful-sinai", "fruitful-genesis", "deep-trinity", "deep-atonement", "deep-victory"];

  it("keeps a fresh guest out of Fruitful and Deep Roots, with no question text", () => {
    const guest = emptyProgress();
    for (const id of lockedIds) {
      const result = openBadgeRun(guest, id, questions);
      expect(result.status, id).toBe("locked");
      expect(result).not.toHaveProperty("questions");
      expect(JSON.stringify(result)).not.toMatch(/Exodus 19|for whose sake/i);
      if (result.status === "locked") {
        expect(result.message).toBe(BADGE_AHEAD_NOTE);
        expect(result.message).not.toMatch(STAGE_WORDS);
      }
      const badge = findPathBadge(id);
      expect(badge).toBeTruthy();
      expect(selectBadgeQuestion(questions, guest, badge!)).toBeNull();
    }
  });

  it("does not let a locked badge be earned", () => {
    const badge = findPathBadge("fruitful-sinai");
    expect(badge).toBeTruthy();
    const after = recordBadgeAnswer(emptyProgress(), badge!, badge!.questionIds[0] ?? "", true, new Date("2026-11-25T12:00:00.000Z"));
    expect(after.badgeRetries?.[badge!.id]).toBeUndefined();
    expect(badgeEarned(after, badge!)).toBe(false);
  });

  it("still shows a Fruitful badge that was already earned", () => {
    const badge = findPathBadge("fruitful-sinai");
    expect(badge).toBeTruthy();
    const progress = {
      ...emptyProgress(),
      badgeRetries: { [badge!.id]: { correctIds: [...badge!.questionIds] } },
    };
    expect(badgeEarned(progress, badge!)).toBe(true);
    expect(mapStageRows(progress).find((row) => row.stage === "Fruitful")?.earned.map((item) => item.id)).toContain("fruitful-sinai");
    const html = renderToStaticMarkup(createElement(StageMap, { progress, seenBadgeIds: [badge!.id] }));
    expect(html).toContain('data-testid="badge-fruitful-sinai"');
    expect(html).toContain('data-state="earned"');
    expect(html).toContain("The Law at Sinai");
    expect(html).toContain('data-icon="tablets"');
  });
});

describe("badge links resolve before they play", () => {
  const { questions } = loadCatalog();

  it("refuses an unknown id instead of the main path", () => {
    const result = openBadgeRun(emptyProgress(), "fruitful-test", questions);
    expect(result.status).toBe("missing");
    expect(result).not.toHaveProperty("questions");
    const page = readFileSync(path.join(process.cwd(), "src/app/play/page.tsx"), "utf8");
    expect(page).toContain('data-testid="badge-missing"');
    expect(page).toContain("questions={[]}");
    expect(page).not.toContain("questionsForBadgeRun");
  });

  it("resolves an alias, then serves an Established badge as its own run", () => {
    const alias = openBadgeRun(emptyProgress(), "deep-judges-the-cycle-of-sin-and-deliverance-deborah-", questions);
    expect(alias.status).toBe("locked");
    if (alias.status === "locked") expect(alias.badge.id).toBe("deep-judges-the-cycle-of-sin-and-deliverance");

    const progress = { ...emptyProgress(), stage: "Established" as const };
    const result = openBadgeRun(progress, "established-isaac", questions);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.questions.map((question) => question.id)).toEqual(result.badge.questionIds);
    expect(result.questions[0]?.id).toBe("c1-gen-0061");
    const ladder = selectLadderQuestion(questions, progress);
    expect(result.questions.map((question) => question.id)).not.toEqual(ladder ? [ladder.question.id] : []);
  });
});

describe("question text shown to the player", () => {
  it("names every chapter a question cites, including Genesis 26 beside Genesis 21", () => {
    const { questions } = loadCatalog();
    const question = questions.find((item) => item.id === "c3-gen-0002");
    expect(question?.section).toBe("Genesis 21");
    expect(question?.teaching.verses.some((verse) => verse.ref === "Genesis 26:24")).toBe(true);
    expect(citedSectionLabel(question!)).toBe("Genesis 21 and Genesis 26");
  });

  it("does not put a second 'the' in front of a badge name", () => {
    expect(badgeEarnedMessage("Creation")).toBe("Well done! You earned the Creation badge.");
    expect(badgeEarnedMessage("The Law at Sinai")).toBe("Well done! You earned The Law at Sinai badge.");
    expect(badgeEarnedMessage("The Law at Sinai")).not.toContain("the The");
  });

  it("matches apostrophes and quotes without editing the stored text", () => {
    expect(matchTypography(`God's "servant" and the boy's line`)).toBe("God\u2019s \u201Cservant\u201D and the boy\u2019s line");
    expect(matchTypography("already \u2018curly\u2019 and \u201Cpaired\u201D")).toBe("already \u2019curly\u2019 and \u201Cpaired\u201D");
  });
});
