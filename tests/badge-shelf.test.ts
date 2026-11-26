// @vitest-environment happy-dom
import fs from "fs";
import path from "path";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

vi.mock("@/lib/bible/passage-client", () => ({
  peekPassage: () => null,
  prefetchPassages: () => {},
  loadPassageCached: () =>
    Promise.resolve({ ok: false, message: "Scripture text isn't available on this copy of the app yet." }),
}));

import { BadgeShelf } from "@/components/BadgeShelf";
import { loadCatalog } from "@/lib/content/load";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import { stageSlug } from "@/lib/game/badges";
import { BADGE_RETRY_CARE, BADGE_RETRY_WAIT } from "@/lib/game/badge-retry";
import {
  SHELF_NOT_EARNED,
  SHELF_PLAY,
  shelfCountLabel,
  shelfPlayHref,
  shelfStages,
  type ShelfSlot,
} from "@/lib/game/badge-shelf";
import { badgePlayHref, knowledgePath, type PathBadge } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import { KNOWLEDGE_PATH, type GameProgress, type KnowledgeStage, type Question } from "@/lib/game/types";
import { createState, parseState } from "@/lib/storage";

const NOW = new Date("2026-11-26T15:00:00.000Z");
const { questions } = loadCatalog();
const byId = new Map(questions.map((question) => [question.id, question]));

function badgeById(id: string): PathBadge {
  const badge = knowledgePath.stages.flatMap((stage) => stage.badges).find((item) => item.id === id);
  if (!badge) throw new Error(id);
  return badge;
}

function progressAt(stage: KnowledgeStage, badgeRetries?: GameProgress["badgeRetries"]): GameProgress {
  return { ...emptyProgress(), stage, ...(badgeRetries ? { badgeRetries } : {}) };
}

function earnedRun(id: string) {
  return { correctIds: [...badgeById(id).questionIds] };
}

const creation = badgeById("seed-creation");
const jonah = badgeById("seed-jonah");
const mixed = progressAt("Sprout", {
  "seed-creation": earnedRun("seed-creation"),
  "seed-jonah": { correctIds: [], retryAt: "2099-01-01T00:00:00.000Z" },
});

function questionsFor(badge: PathBadge): Question[] {
  return badge.questionIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
}

function spoilerText(question: Question): string[] {
  const wording = [
    question.prompt.adult,
    question.prompt.child,
    question.prompt.teen,
    question.prompt.older,
    question.teaching.explanation.adult,
    question.teaching.explanation.child,
    question.teaching.explanation.teen,
    question.teaching.explanation.older,
    question.teaching.extended_explanation,
    question.teaching.takeaway,
    question.review.notes,
  ];
  return [
    ...wording.filter((line): line is string => Boolean(line)),
    ...question.choices.map((choice) => choice.text),
    ...question.teaching.verses.flatMap((verse) => [verse.ref, verse.text]),
    question.answer,
  ];
}

function expectNoSpoilers(target: string, badge: PathBadge, allowed: string) {
  for (const question of questionsFor(badge)) {
    for (const secret of spoilerText(question)) {
      const text = secret.trim();
      if (text.length < 8 || allowed.includes(text)) continue;
      expect(target, text).not.toContain(text);
    }
  }
}

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

function button(testId: string) {
  const node = document.querySelector(`[data-testid="${testId}"]`);
  if (!(node instanceof HTMLButtonElement)) throw new Error(`missing ${testId}`);
  return node;
}

describe("full badge shelf", () => {
  it("counts every slot on each reached stage and hides the rest", () => {
    const sprout = shelfStages(mixed, questions, NOW);
    expect(sprout.map((stage) => stage.stage)).toEqual(["Seed", "Sprout"]);
    expect(sprout.map((stage) => [stage.stage, stage.total, stage.earned])).toEqual([
      ["Seed", 9, 1],
      ["Sprout", 17, 0],
    ]);
    for (const stage of sprout) {
      const pathStage = knowledgePath.stages.find((item) => item.stage === stage.stage);
      expect(stage.slots.map((slot) => slot.id)).toEqual(pathStage?.badges.map((badge) => badge.id));
      expect(stage.total).toBe(pathStage?.badges.length);
      expect(shelfCountLabel(stage.earned, stage.total)).toBe(`${stage.earned} of ${stage.total}`);
    }
    expect(sprout.some((stage) => stage.slots.some((slot) => slot.id === "fruitful-jude"))).toBe(false);

    const established = shelfStages(progressAt("Established"), questions, NOW);
    expect(established.map((stage) => stage.stage)).toEqual(["Seed", "Sprout", "Rooted", "Growing", "Established"]);
    expect(established.reduce((sum, stage) => sum + stage.total, 0)).toBe(9 + 17 + 25 + 27 + 29);
    for (const name of ["Fruitful", "Deep Roots"]) {
      expect(established.some((stage) => stage.stage === name)).toBe(false);
    }

    const finished = shelfStages(progressAt("Deep Roots"), questions, NOW);
    expect(finished.map((stage) => stage.stage)).toEqual([...KNOWLEDGE_PATH]);
    expect(finished.reduce((sum, stage) => sum + stage.total, 0)).toBe(218);

    const html = mount(createElement(BadgeShelf, { stages: sprout })).innerHTML;
    expect(html).toContain(`>${shelfCountLabel(1, 9)}<`);
    expect(html).toContain(`>${shelfCountLabel(0, 17)}<`);
    expect(html).toContain('data-testid="shelf-stage-seed"');
    expect(html).toContain('data-testid="shelf-stage-sprout"');
    expect(html).not.toContain('data-testid="shelf-stage-rooted"');
    expect(html).not.toContain('data-testid="shelf-stage-growing"');
    expect(html).not.toContain('data-testid="shelf-stage-established"');
    expect(html).not.toContain('data-testid="shelf-stage-fruitful"');
    expect(html).not.toContain('data-testid="shelf-stage-deep-roots"');
    expect(html).not.toContain("fruitful-jude");
    for (const stage of sprout) {
      expect(html).toContain(`data-testid="shelf-count-${stageSlug(stage.stage)}"`);
      for (const slot of stage.slots) expect(html).toContain(`data-testid="shelf-badge-${slot.id}"`);
    }
    const text = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
    expect(text.toLowerCase()).not.toMatch(/\b(difficulty|easy|intermediate|advanced|expert|ages?)\b/);
    expect(text.toLowerCase()).not.toMatch(/shame|failed|you missed|incomplete|try harder|wrong answer/);
    expect(text).not.toContain("Unlocks after you earn every badge before it");
  });

  it("never puts a verse or an answer on an unearned badge", () => {
    const stages = shelfStages(mixed, questions, NOW);
    const allowed = stages
      .flatMap((stage) => [stage.stage, ...stage.slots.flatMap((slot) => [slot.name, slot.id, slot.art, slot.ref ?? ""])])
      .join("\n");
    for (const stage of stages) {
      for (const slot of stage.slots) {
        expect(Object.keys(slot).sort()).toEqual(slot.ref ? ["art", "id", "name", "ref", "status"] : ["art", "id", "name", "status"]);
        const badge = badgeById(slot.id);
        expectNoSpoilers(JSON.stringify(slot), badge, slot.status === "earned" ? `${allowed}\n${slot.ref ?? ""}` : allowed);
        if (slot.status === "earned") {
          expect(slot.ref).toBe(questionsFor(badge)[0]?.teaching.verses.find((verse) => verse.ref.trim())?.ref.trim());
        } else {
          expect(slot).not.toHaveProperty("ref");
        }
      }
    }

    const creationSlot = stages[0]?.slots.find((slot) => slot.id === "seed-creation");
    const noahSlot = stages[0]?.slots.find((slot) => slot.id === "seed-noah");
    const jonahSlot = stages[0]?.slots.find((slot) => slot.id === "seed-jonah");
    expect(creationSlot?.status).toBe("earned");
    expect(noahSlot?.status).toBe("playable");
    expect(jonahSlot?.status).toBe("locked");

    mount(createElement(BadgeShelf, { stages }));
    act(() => {
      button("shelf-badge-seed-noah").click();
    });
    const opened = document.body.innerHTML;
    expect(opened).toContain('data-testid="shelf-unearned"');
    expect(opened).not.toContain('data-testid="verse"');
    expect(opened).not.toContain('data-testid="scripture-notice"');
    expect(opened).not.toContain(creationSlot?.ref ?? "missing-ref");
    expectNoSpoilers(opened, badgeById("seed-noah"), allowed);
    expectNoSpoilers(opened, badgeById("seed-jonah"), allowed);
    expect(opened).not.toContain("SECRET-ANSWER");

    const poisoned: ShelfSlot = {
      id: "seed-noah",
      name: "Noah",
      art: "noah",
      status: "playable",
      ref: "Genesis 99:99",
    };
    act(() => root?.unmount());
    mount(
      createElement(BadgeShelf, {
        stages: [{ stage: "Seed", earned: 0, total: 1, slots: [poisoned] }],
      }),
    );
    act(() => {
      button("shelf-badge-seed-noah").click();
    });
    expect(document.body.innerHTML).not.toContain("Genesis 99:99");
    expect(document.body.innerHTML).not.toContain('data-testid="verse"');
  });

  it("links play only when the badge can be tried now", () => {
    expect(shelfPlayHref({ id: "seed-noah", status: "playable" })).toBe(badgePlayHref("seed-noah"));
    expect(shelfPlayHref({ id: "seed-jonah", status: "locked" })).toBeNull();
    expect(shelfPlayHref({ id: "seed-creation", status: "earned" })).toBeNull();

    const stages = shelfStages(mixed, questions, NOW);
    const html = mount(createElement(BadgeShelf, { stages })).innerHTML;
    expect(html).not.toContain("/play?badge=");
    expect(html).not.toContain('data-testid="shelf-play-link"');

    act(() => {
      button("shelf-badge-seed-noah").click();
    });
    const playable = document.body.innerHTML;
    expect(playable).toContain(`${SHELF_NOT_EARNED} `);
    expect(playable).toContain(SHELF_PLAY);
    expect(playable).toContain(`href="${badgePlayHref("seed-noah")}"`);
    expect(playable).toContain('data-testid="shelf-play-link"');
    expect(playable).not.toContain(BADGE_RETRY_WAIT);
    expect(button("shelf-badge-seed-noah").getAttribute("aria-label")).toBe("Noah, not earned yet");

    act(() => {
      button("shelf-note-close").click();
    });
    act(() => {
      button("shelf-badge-seed-jonah").click();
    });
    const locked = document.body.innerHTML;
    expect(locked).toContain('data-testid="shelf-locked"');
    expect(locked).toContain(SHELF_NOT_EARNED);
    expect(locked).toContain(BADGE_RETRY_WAIT);
    expect(locked).toContain(BADGE_RETRY_CARE);
    expect(locked).not.toContain('data-testid="shelf-play-link"');
    expect(locked).not.toContain("/play?badge=");
    expect(locked).not.toContain('data-testid="verse"');
    expect(button("shelf-badge-seed-jonah").getAttribute("aria-label")).toContain("not earned yet");
    expect(button("shelf-badge-seed-jonah").getAttribute("aria-label")).toContain("Locked for 24 hours");
  });

  it("shows a clock on a locked badge and keeps earned badges in color", () => {
    const stages = shelfStages(mixed, questions, NOW);
    mount(createElement(BadgeShelf, { stages }));
    const earned = button("shelf-badge-seed-creation").innerHTML;
    const waiting = button("shelf-badge-seed-jonah").innerHTML;
    const open = button("shelf-badge-seed-noah").innerHTML;
    expect(earned).toContain("badge-shine");
    expect(earned).not.toContain("shelf-unearned");
    expect(earned).not.toContain('data-chip="clock"');
    expect(button("shelf-badge-seed-creation").getAttribute("aria-label")).toBe("Creation, earned");
    expect(waiting).toContain("shelf-unearned");
    expect(waiting).not.toContain("badge-shine");
    expect(waiting).toContain('data-chip="clock"');
    expect(waiting).toContain('aria-label="Locked for 24 hours"');
    expect(open).toContain("shelf-unearned");
    expect(open).not.toContain("badge-shine");
    expect(open).not.toContain('data-chip="clock"');
    expect(open).toContain('data-icon="ark"');
    expect(open).toContain(">Noah<");

    act(() => {
      button("shelf-badge-seed-jonah").click();
    });
    expect(document.querySelector('[data-testid="shelf-locked"]')?.innerHTML).toContain('data-chip="clock"');
    expect(document.querySelector('[data-testid="shelf-locked"] [data-testid="shelf-play-link"]')).toBeNull();

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const faded = css.match(/\.shelf-unearned \.badge-art\s*\{[^}]+\}/)?.[0] ?? "";
    expect(faded).toContain("grayscale(1)");
    expect(faded).toContain("opacity: 0.7");
    expect(faded).not.toContain("animation");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("@media (min-width: 24rem)");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".badge-shine::after");
    expect(reduced).toContain("animation: none");
  });

  it("opens an earned verse with the scripture notice and keeps a guest shelf on the device", async () => {
    const stages = shelfStages(mixed, questions, NOW);
    const ref = stages[0]?.slots.find((slot) => slot.id === "seed-creation")?.ref ?? "";
    expect(ref.length).toBeGreaterThan(0);
    mount(createElement(BadgeShelf, { stages, dailyBadges: [{ day: "2026-11-26", ref: "John 11:35" }] }));
    expect(button("shelf-badge-daily-2026-11-26").getAttribute("aria-label")).toBe("Daily, earned");
    expect(document.body.innerHTML).not.toContain("John 11:35");

    await act(async () => {
      button("shelf-badge-seed-creation").click();
    });
    const verse = document.querySelector('[data-testid="badge-verse"]');
    expect(verse).toBeTruthy();
    expect(verse?.innerHTML).toContain(ref);
    expect(verse?.innerHTML).toContain('data-testid="verse"');
    expect(verse?.innerHTML).toContain(NKJV_COPYRIGHT);
    expect(verse?.innerHTML).toContain("API.Bible");
    expect(verse?.innerHTML).not.toContain("line-clamp");
    expect(verse?.innerHTML).not.toContain('data-testid="shelf-play-link"');

    const guest = createState("adult", "judah");
    guest.placementComplete = true;
    guest.progress = mixed;
    const stored = parseState(JSON.stringify(guest));
    const again = shelfStages(stored?.progress ?? emptyProgress(), questions, NOW);
    expect(again[0]?.slots.find((slot) => slot.id === "seed-jonah")?.status).toBe("locked");
    expect(again[0]?.slots.find((slot) => slot.id === "seed-creation")?.status).toBe("earned");
    expect(again.map((stage) => stage.stage)).toEqual(["Seed", "Sprout"]);
  });
});
