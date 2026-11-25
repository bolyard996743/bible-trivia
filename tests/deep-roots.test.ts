import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { StageMap } from "@/components/StageMap";
import { bookFromCode, bookFromQuestionId, findBook, parseReference } from "@/lib/bible/books";
import { DEEP_ROOTS_LINE_BATCHES, deepRootsLinesPath } from "@/lib/content/deep-roots-lines";
import { loadCatalog } from "@/lib/content/load";
import { validateContentTree } from "@/lib/content/validate";
import { visibleBadges, visibleMapStages } from "@/lib/game/badges";
import { badgeLook } from "@/lib/game/badge-look";
import { advanceStage } from "@/lib/game/ladder";
import { linesForBadgePlay, linesForPathPlay, pickMascotLine } from "@/lib/game/mascot";
import { findPathBadge, knowledgePath } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import { MASCOT_IDS, type MascotId } from "@/lib/game/types";
import { questionsForBadgeRun } from "@/lib/game/badges";

const PLAYER_WORDS =
  /\b(seed|sprout|rooted|growing|established|fruitful|deep roots|easy|intermediate|advanced|expert|foundation|age|ages|child|children|teen|teens|adult|adults|older|younger|hard|difficulty)\b/i;

function approvedLines(mascot: MascotId): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const batch of DEEP_ROOTS_LINE_BATCHES) {
    const file = path.join(process.cwd(), deepRootsLinesPath(mascot, batch));
    Object.assign(merged, JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>);
  }
  return merged;
}

describe("Deep Roots", () => {
  const deep = knowledgePath.stages.find((stage) => stage.stage === "Deep Roots");
  const fruitful = knowledgePath.stages.find((stage) => stage.stage === "Fruitful");

  it("plays a Deep Roots question with each guide's approved line", () => {
    const { questions, lines } = loadCatalog();
    const badge = findPathBadge("deep-obadiah");
    expect(badge?.questionIds[0]).toBe("c1-oba-0001");
    const question = questions.find((item) => item.id === "c1-oba-0001");
    expect(question?.stage).toBe("Deep Roots");
    expect(questionsForBadgeRun(questions, badge!)[0]?.id).toBe("c1-oba-0001");

    const pathLines = linesForPathPlay(lines);
    const badgeLines = linesForPathPlay(linesForBadgePlay(lines, badge!.questionIds));
    const moments = ["wrong_intro", "correct", "correct_after_retry"] as const;
    for (const mascot of MASCOT_IDS) {
      const source = approvedLines(mascot);
      expect(source["c1-oba-0001"]?.length).toBeGreaterThan(0);
      expect(source["c1-3jn-0001"]?.length).toBeGreaterThan(0);
      for (const moment of moments) {
        expect(pickMascotLine(pathLines, mascot, moment, "child", { questionId: "c1-oba-0001" })?.text).toBe(
          source["c1-oba-0001"],
        );
        expect(pickMascotLine(badgeLines, mascot, moment, "older", { questionId: "c1-oba-0001" })?.text).toBe(
          source["c1-oba-0001"],
        );
        expect(pickMascotLine(pathLines, mascot, moment, "adult", { questionId: "c1-3jn-0001" })?.text).toBe(
          source["c1-3jn-0001"],
        );
      }
    }
  });

  it("resolves every Deep Roots book code, including oba, nah, zep, phm, 2jn, and 3jn", () => {
    const { questions } = loadCatalog();
    const deepQuestions = questions.filter((question) => question.stage === "Deep Roots");
    expect(deepQuestions).toHaveLength(404);
    const codes = new Set<string>();
    for (const question of deepQuestions) {
      const fromId = bookFromQuestionId(question.id);
      expect(fromId, question.id).toBeTruthy();
      expect(findBook(question.book)?.name, question.id).toBe(question.book);
      const code = /^c\d+-([a-z0-9]+)-\d+$/.exec(question.id)?.[1];
      expect(code, question.id).toBeTruthy();
      codes.add(code!);
      for (const verse of question.teaching.verses) {
        const parsed = parseReference(verse.ref);
        expect(parsed, `${question.id} ${verse.ref}`).not.toBeNull();
        expect(parsed?.book.chapterCount).toBeGreaterThanOrEqual(parsed?.chapter ?? 0);
      }
    }
    expect(bookFromCode("oba")).toMatchObject({ id: "OBA", name: "Obadiah" });
    expect(bookFromCode("nah")).toMatchObject({ id: "NAM", name: "Nahum" });
    expect(bookFromCode("zep")).toMatchObject({ id: "ZEP", name: "Zephaniah" });
    expect(bookFromCode("phm")).toMatchObject({ id: "PHM", name: "Philemon" });
    expect(bookFromCode("2jn")).toMatchObject({ id: "2JN", name: "2 John" });
    expect(bookFromCode("3jn")).toMatchObject({ id: "3JN", name: "3 John" });
    expect(findBook("nah")?.id).toBe("NAM");
    expect(parseReference("Nahum 1:1")?.book.id).toBe("NAM");
    expect(parseReference("Obadiah 1:21")?.book.id).toBe("OBA");
    expect(parseReference("Zephaniah 3:17")?.book.id).toBe("ZEP");
    expect(parseReference("Philemon 1:1")?.book.id).toBe("PHM");
    expect(parseReference("2 John 1:1")?.book.id).toBe("2JN");
    expect(parseReference("3 John 1:1")?.book.id).toBe("3JN");
    for (const code of ["oba", "nah", "zep", "phm", "2jn", "3jn"]) expect(codes.has(code)).toBe(true);
  });

  it("unlocks after Fruitful and shows all 42 badges only once that stage is reached", () => {
    expect(fruitful?.badges.every((badge) => badge.questionIds.length === 8)).toBe(true);
    const fruitfulIds = fruitful?.badges.flatMap((badge) => badge.questionIds) ?? [];
    expect(fruitfulIds).toHaveLength(552);
    const { questions } = loadCatalog();
    const almost = {
      ...emptyProgress(),
      stage: "Fruitful" as const,
      masteredIds: fruitfulIds.slice(0, -1),
      firstTryIds: fruitfulIds.slice(0, -1),
    };
    expect(advanceStage(questions, almost).stage).toBe("Fruitful");
    expect(visibleMapStages(almost)).toEqual(["Seed", "Sprout", "Rooted", "Growing", "Established", "Fruitful"]);
    expect(visibleMapStages(almost)).not.toContain("Deep Roots");

    const finished = {
      ...almost,
      masteredIds: fruitfulIds,
      firstTryIds: fruitfulIds,
    };
    expect(visibleMapStages(finished)).not.toContain("Deep Roots");
    const opened = advanceStage(questions, finished);
    expect(opened.stage).toBe("Deep Roots");
    expect(visibleMapStages(opened)).toEqual([
      "Seed",
      "Sprout",
      "Rooted",
      "Growing",
      "Established",
      "Fruitful",
      "Deep Roots",
    ]);
    expect(visibleBadges(deep?.badges ?? [])).toHaveLength(42);

    const hidden = renderToStaticMarkup(
      createElement(StageMap, { progress: almost, seenBadgeIds: [] }),
    );
    expect(hidden).not.toContain("stage-block-deep-roots");
    expect(hidden).not.toContain("badge-deep-obadiah");
    expect(hidden).not.toContain("badge-deep-3john");

    const shown = renderToStaticMarkup(
      createElement(StageMap, { progress: opened, seenBadgeIds: [] }),
    );
    expect(shown).toContain('data-testid="stage-block-deep-roots"');
    for (const badge of deep?.badges ?? []) {
      expect(shown).toContain(`data-testid="badge-${badge.id}"`);
    }
    expect(shown).toMatch(/Obadiah: Edom(?:'|&#x27;)s Fall/);
    expect(shown).toContain("3 John: Walking in the Truth");
  });

  it("uses the outline names for badges 17 and 22 and keeps stage words off the badges", () => {
    expect(deep?.badges).toHaveLength(42);
    expect(deep?.badges[16]).toMatchObject({
      id: "deep-the-twelve-minor-prophets-order-and-setting",
      name: "The Twelve Minor Prophets: Order and Setting",
    });
    expect(deep?.badges[21]).toMatchObject({
      id: "deep-judges-the-cycle-of-sin-and-deliverance",
      name: "Judges: The Cycle of Sin and Deliverance",
    });
    expect(findPathBadge("deep-the-twelve-minor-prophets-order-and-setting-open")?.id).toBe(
      "deep-the-twelve-minor-prophets-order-and-setting",
    );
    expect(findPathBadge("deep-judges-the-cycle-of-sin-and-deliverance-deborah-")?.name).toBe(
      "Judges: The Cycle of Sin and Deliverance",
    );
    for (const badge of deep?.badges ?? []) {
      expect(badge.name, badge.id).not.toMatch(PLAYER_WORDS);
      expect(badge.name).not.toContain("_(");
      expect(badgeLook(badge.art, badge.id).fallback, badge.id).toBe(false);
    }
    expect(badgeLook("fortress", "deep-obadiah").icon).toBe("wall");
    expect(badgeLook("sandals", "deep-3john").icon).toBe("road");
    expect(badgeLook("horse", "deep-victory").icon).toBe("horse");
    expect(badgeLook("gate", "deep-nahum").icon).toBe("door");
  });

  it("counts 1,848 questions and expands 2,020 Deep Roots strings into line records", () => {
    const result = validateContentTree(process.cwd());
    expect(result.ok, result.errors.slice(0, 20).join("\n")).toBe(true);
    expect(result.questionCount).toBe(1848);
    // Each approved string becomes wrong_intro, correct, and correct_after_retry.
    expect(result.lineCount).toBe(21796 + 2020 * 3);
  });

  it("requires a line from all five guides for every Deep Roots question", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes", "deeproots_a_lines.json");
    const lines = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    delete lines["c1-oba-0001"];
    lines["c1-gen-0020"] = "This seed question does not belong in the Deep Roots file.";
    fs.writeFileSync(file, JSON.stringify(lines));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Deep Roots question c1-oba-0001 is missing a correct line for agnes");
    expect(result.errors).toContain("Deep Roots question c1-oba-0001 is missing a wrong_intro line for agnes");
    expect(result.errors).toContain("Deep Roots question c1-oba-0001 is missing a correct_after_retry line for agnes");
    expect(result.errors).toContain(
      "content/mascots/agnes/deeproots_a_lines.json: c1-gen-0020 is not a Deep Roots question",
    );
  });
});
