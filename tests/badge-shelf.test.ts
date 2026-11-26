// @vitest-environment happy-dom
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
import { pathShelfBadges } from "@/lib/game/badge-shelf";
import { knowledgePath } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress, Question } from "@/lib/game/types";
import { createState, parseState } from "@/lib/storage";

const { questions } = loadCatalog();
const byId = new Map(questions.map((question) => [question.id, question]));

function badgeById(id: string) {
  const badge = knowledgePath.stages.flatMap((stage) => stage.badges).find((item) => item.id === id);
  if (!badge) throw new Error(id);
  return badge;
}

function progressWith(retries: GameProgress["badgeRetries"]): GameProgress {
  return { ...emptyProgress(), stage: "Sprout", badgeRetries: retries };
}

function spoilers(question: Question): string[] {
  return [
    question.prompt.adult,
    question.teaching.explanation.adult,
    question.teaching.takeaway,
    ...question.choices.map((choice) => choice.text),
    ...question.teaching.verses.flatMap((verse) => [verse.ref, verse.text]),
  ].filter((line): line is string => Boolean(line && line.trim().length >= 8));
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

describe("earned badge shelf", () => {
  const creation = badgeById("seed-creation");
  const noah = badgeById("seed-noah");
  const jonah = badgeById("seed-jonah");
  const progress = progressWith({
    "seed-creation": { correctIds: [...creation.questionIds] },
    "seed-jonah": { correctIds: [], retryAt: "2099-01-01T00:00:00.000Z" },
  });

  it("shows only earned badges, in color, and opens the verse", async () => {
    const entries = pathShelfBadges(progress, questions);
    expect(entries.map((entry) => entry.id)).toEqual(["seed-creation"]);
    expect(entries[0]?.ref).toBe(byId.get(creation.questionIds[0])?.teaching.verses[0]?.ref);
    for (const badge of [noah, jonah]) {
      const shown = JSON.stringify(entries);
      for (const questionId of badge.questionIds) {
        const question = byId.get(questionId);
        if (!question) continue;
        for (const secret of spoilers(question)) expect(shown).not.toContain(secret);
      }
    }

    const html = mount(createElement(BadgeShelf, { progress, questions })).innerHTML;
    expect(html).toContain('data-testid="shelf-badge-seed-creation"');
    expect(html).toContain("badge-shine");
    expect(html).toContain("Creation, earned");
    expect(html).not.toContain("shelf-badge-seed-noah");
    expect(html).not.toContain("shelf-badge-seed-jonah");
    expect(html).not.toContain("map-unearned");
    expect(html).not.toContain("shelf-unearned");
    expect(html).not.toContain('data-chip="clock"');
    expect(html).not.toContain("/play?badge=");
    expect(html).not.toContain(" of ");
    expect(html).not.toContain("Not earned yet");
    for (const questionId of noah.questionIds) {
      const question = byId.get(questionId);
      if (!question) continue;
      for (const secret of spoilers(question)) expect(html).not.toContain(secret);
    }

    const button = document.querySelector('[data-testid="shelf-badge-seed-creation"]');
    if (!(button instanceof HTMLButtonElement)) throw new Error("missing earned badge");
    await act(async () => {
      button.click();
    });
    const verse = document.querySelector('[data-testid="badge-verse"]');
    expect(verse?.textContent).toContain(entries[0]?.ref ?? "");
    expect(verse?.innerHTML).toContain(NKJV_COPYRIGHT);
    expect(verse?.innerHTML).toContain("API.Bible");
    expect(document.body.innerHTML).not.toContain("Not earned yet");
  });

  it("stays empty until a badge is earned and keeps a guest shelf on the device", () => {
    const empty = renderShelf(emptyProgress());
    expect(empty).toContain('data-testid="badge-shelf-empty"');
    expect(empty).toContain("Badges you earn will sit here.");
    expect(empty).not.toContain("shelf-badge-");

    const guest = createState("adult", "judah");
    guest.placementComplete = true;
    guest.progress = progress;
    const stored = parseState(JSON.stringify(guest));
    expect(pathShelfBadges(stored?.progress ?? emptyProgress(), questions).map((entry) => entry.id)).toEqual(["seed-creation"]);
  });
});

function renderShelf(progress: GameProgress) {
  return mount(createElement(BadgeShelf, { progress, questions })).innerHTML;
}
