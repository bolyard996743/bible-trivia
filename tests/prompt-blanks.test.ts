// @vitest-environment happy-dom
import fs from "fs";
import { createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptText } from "@/components/PromptText";
import { splitPromptBlanks } from "@/lib/game/blanks";
import { loadCatalog } from "@/lib/content/load";
import { stageForQuestion } from "@/lib/game/question-stage";
import type { AgeGroup, KnowledgeStage, MascotLine, Question } from "@/lib/game/types";

vi.mock("@/lib/bible/passage-client", () => ({
  prefetchPassages: () => {},
  peekPassage: () => null,
  loadPassageCached: () => Promise.resolve({ ok: false, message: "" }),
}));

vi.mock("@/components/FetchedPassage", () => ({
  FetchedPassage: ({ reference }: { reference: string }) => createElement("p", { "data-testid": "verse" }, reference),
}));

import { QuestionSession } from "@/components/QuestionSession";

const AGES: AgeGroup[] = ["adult", "child", "teen", "older"];
const STAGES: KnowledgeStage[] = ["Seed", "Sprout", "Rooted", "Growing", "Established", "Fruitful", "Deep Roots"];

const lines: MascotLine[] = [];

function markerKinds(text: string): string[] {
  const kinds: string[] = [];
  if (/(?<!_)_{2}(?!_)/.test(text)) kinds.push("underscores-2");
  if (/(?<!_)_{3}(?!_)/.test(text)) kinds.push("underscores-3");
  if (/_{4,}/.test(text)) kinds.push("underscores-4plus");
  if (/…/.test(text)) kinds.push("unicode-ellipsis");
  if (/(?<!\.)\.{3}(?!\.)/.test(text)) kinds.push("ascii-ellipsis");
  if (/\{\s*blank\s*\}/i.test(text)) kinds.push("brace-blank");
  if (/\[\s*blank\s*\]/i.test(text)) kinds.push("bracket-blank");
  if (/\(\s*blank\s*\)/i.test(text)) kinds.push("paren-blank");
  if (/<\s*blank\s*>/i.test(text)) kinds.push("angle-blank");
  return kinds;
}

function hasGapDots(text: string): boolean {
  return /(?<!\.)\.{3}(?!\.)(?!\?)/.test(text);
}

function markup(text: string): string {
  return renderToStaticMarkup(createElement(PromptText, { text }));
}

function question(prompt: Question["prompt"]): Question {
  return {
    id: "q-blank",
    cycle: 1,
    tier: "foundation",
    testament: "OT",
    book: "Genesis",
    section: "Creation",
    topics: ["sample"],
    placement_eligible: false,
    type: "multiple_choice",
    prompt,
    choices: [
      { id: "a", text: "One" },
      { id: "b", text: "Two" },
    ],
    answer: "b",
    teaching: {
      verses: [{ ref: "Genesis 1:1", text: "In the beginning God created the heavens and the earth.", translation: "NKJV" }],
      explanation: { adult: "The verse tells the story." },
      takeaway: "God made the world.",
    },
    review: { status: "draft", notes: "" },
  };
}

let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  document.head.querySelector("[data-testid='prompt-css']")?.remove();
});

function render(node: ReactNode) {
  const main = document.createElement("main");
  document.body.appendChild(main);
  root = createRoot(main);
  act(() => {
    root?.render(node);
  });
  return main;
}

function installHeadingCss() {
  const css = fs.readFileSync("src/app/globals.css", "utf8");
  const start = css.indexOf("main h1:not(.question-prompt)");
  const end = css.indexOf(".site-header");
  const style = document.createElement("style");
  style.dataset.testid = "prompt-css";
  style.textContent = `:root { --gold: #7a4e0c; }\n${css.slice(start, end)}`;
  document.head.appendChild(style);
}

describe("prompt blanks", () => {
  it("renders a blank inline at the marker, and keeps punctuation with the gap", () => {
    expect(splitPromptBlanks("Before the gap ___ after the gap.")).toEqual([
      { kind: "text", text: "Before the gap " },
      { kind: "blank", trailing: "" },
      { kind: "text", text: " after the gap." },
    ]);
    const html = markup("Before the gap ___ after the gap.");
    const gap = html.indexOf('data-testid="prompt-blank"');
    expect(html.indexOf("Before the gap")).toBeGreaterThanOrEqual(0);
    expect(gap).toBeGreaterThan(html.indexOf("Before the gap"));
    expect(gap).toBeLessThan(html.indexOf("after the gap"));
    expect(html).not.toContain("___");
    expect(html).toContain(">blank<");
    expect(markup('Finish the line "that ___."')).toContain('data-testid="prompt-blank"');
    expect(markup('Finish the line "that ___."')).toContain(".");
    expect(markup('Finish the line "that ___."')).not.toContain("___");
  });

  it("does not draw the heading accent under a question prompt", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("main h1:not(.question-prompt)");
    expect(css).toContain(".stage-card h2:not(.question-prompt)");
    expect(css).not.toMatch(/^main h1,/m);
    expect(css).toMatch(/\.question-prompt\s*\{[^}]*background-image:\s*none/);
    expect(css).toMatch(/\.prompt-blank\s*\{[^}]*display:\s*inline-block/);
    expect(css).toMatch(/\.prompt-blank\s*\{[^}]*[\s;]width:\s*3\.25rem/);
    expect(css).not.toMatch(/\.prompt-blank\s*\{[^}]*[\s;]width:\s*100%/);

    installHeadingCss();
    const main = render(
      createElement(
        "div",
        null,
        createElement("h1", { "data-testid": "page-title" }, "Your Knowledge Path"),
        createElement(QuestionSession, {
          question: question({ adult: "What name did she give?" }),
          ageGroup: "adult",
          mascot: "judah",
          lines,
          soundOn: false,
          audioFiles: [],
          onContinue: () => undefined,
        }),
      ),
    );
    const prompt = main.querySelector("[data-testid='prompt']");
    const title = main.querySelector("[data-testid='page-title']");
    if (!(prompt instanceof HTMLElement) || !(title instanceof HTMLElement)) throw new Error("missing headings");
    expect(prompt.className).toContain("question-prompt");
    expect(prompt.querySelector("[data-testid='prompt-blank']")).toBeNull();
    expect(prompt.textContent).toBe("What name did she give?");
    expect(getComputedStyle(prompt).backgroundImage).toBe("none");
    expect(getComputedStyle(title).backgroundImage).toContain("linear-gradient");
    expect(getComputedStyle(title).backgroundSize).toMatch(/^(52px|3\.25rem) 3px$/);
    expect(getComputedStyle(prompt).backgroundSize).not.toMatch(/3px$/);

    const daily = fs.readFileSync("src/components/DailyChallengeClient.tsx", "utf8");
    expect(daily).toContain("<PromptText");
    expect(daily).toContain("question-prompt");
    expect(daily).not.toContain("matchTypography(ask.prompt)");
  });

  it("places the gap inside the play prompt, between the words around the marker", () => {
    installHeadingCss();
    const main = render(
      createElement(QuestionSession, {
        question: question({ adult: "I can do ___ through Christ who strengthens me." }),
        ageGroup: "adult",
        mascot: "judah",
        lines,
        soundOn: false,
        audioFiles: [],
        onContinue: () => undefined,
      }),
    );
    const prompt = main.querySelector("[data-testid='prompt']");
    if (!(prompt instanceof HTMLElement)) throw new Error("missing prompt");
    const blank = prompt.querySelector("[data-testid='prompt-blank']");
    if (!(blank instanceof HTMLElement)) throw new Error("missing blank");
    expect(prompt.textContent).toBe("I can do blank through Christ who strengthens me.");
    expect(prompt.innerHTML.indexOf("I can do")).toBeLessThan(prompt.innerHTML.indexOf("prompt-blank"));
    expect(prompt.innerHTML.indexOf("prompt-blank")).toBeLessThan(prompt.innerHTML.indexOf("through Christ"));
    expect(prompt.innerHTML).not.toContain("___");
    expect(blank.textContent).toBe("blank");
    expect(getComputedStyle(blank).display).toBe("inline-block");
    expect(getComputedStyle(prompt).backgroundImage).toBe("none");
    expect(blank.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_CONTAINS).toBeTruthy();
  });

  it("handles every blank marker that exists in content, and the named alternates", () => {
    const { questions } = loadCatalog();
    const promptsByStage: Record<string, Record<string, number>> = {};
    const questionsByStage: Record<string, { underscores: Set<string>; ellipsis: Set<string> }> = {};
    for (const stage of STAGES) {
      promptsByStage[stage] = { "underscores-3": 0, "ascii-ellipsis": 0 };
      questionsByStage[stage] = { underscores: new Set(), ellipsis: new Set() };
    }
    const found = new Set<string>();
    const markedPrompts: { id: string; text: string; kinds: string[] }[] = [];
    for (const item of questions) {
      const stage = stageForQuestion(item);
      for (const age of AGES) {
        const text = item.prompt[age];
        if (!text) continue;
        const kinds = markerKinds(text);
        for (const kind of kinds) found.add(kind);
        if (kinds.includes("underscores-3")) {
          promptsByStage[stage]!["underscores-3"] += 1;
          questionsByStage[stage]!.underscores.add(item.id);
        }
        if (kinds.includes("ascii-ellipsis")) {
          promptsByStage[stage]!["ascii-ellipsis"] += 1;
          questionsByStage[stage]!.ellipsis.add(item.id);
        }
        if (kinds.length > 0) markedPrompts.push({ id: item.id, text, kinds });
      }
    }

    expect([...found].sort()).toEqual(["ascii-ellipsis", "underscores-3"]);
    expect(promptsByStage).toEqual({
      Seed: { "underscores-3": 0, "ascii-ellipsis": 1 },
      Sprout: { "underscores-3": 6, "ascii-ellipsis": 0 },
      Rooted: { "underscores-3": 0, "ascii-ellipsis": 4 },
      Growing: { "underscores-3": 1, "ascii-ellipsis": 9 },
      Established: { "underscores-3": 0, "ascii-ellipsis": 3 },
      Fruitful: { "underscores-3": 127, "ascii-ellipsis": 0 },
      "Deep Roots": { "underscores-3": 0, "ascii-ellipsis": 0 },
    });
    expect(Object.fromEntries(STAGES.map((stage) => [stage, questionsByStage[stage]!.underscores.size]))).toEqual({
      Seed: 0,
      Sprout: 2,
      Rooted: 0,
      Growing: 1,
      Established: 0,
      Fruitful: 121,
      "Deep Roots": 0,
    });
    expect(Object.fromEntries(STAGES.map((stage) => [stage, questionsByStage[stage]!.ellipsis.size]))).toEqual({
      Seed: 1,
      Sprout: 0,
      Rooted: 1,
      Growing: 5,
      Established: 1,
      Fruitful: 0,
      "Deep Roots": 0,
    });

    for (const sample of markedPrompts) {
      const html = markup(sample.text);
      if (sample.kinds.includes("underscores-3") || hasGapDots(sample.text)) {
        expect(html, sample.id).toContain('data-testid="prompt-blank"');
        expect(html, sample.id).toContain(">blank<");
        expect(html, sample.id).not.toMatch(/_{3,}/);
        expect(html, sample.id).not.toMatch(/(?<!\.)\.{3}(?!\.)(?!\?)/);
      }
    }

    const abbreviation = questions.find((item) => item.id === "c2-mat-0007")?.prompt.teen ?? "";
    expect(abbreviation).toContain("...");
    expect(hasGapDots(abbreviation)).toBe(false);
    const leftAsPunctuation = markup(abbreviation);
    expect(leftAsPunctuation).toContain("...");
    expect(leftAsPunctuation).not.toContain("prompt-blank");

    const rebekah = questions.find((item) => item.id === "c3-gen-0001");
    expect(rebekah).toBeTruthy();
    for (const age of AGES) {
      expect(markerKinds(rebekah?.prompt[age] ?? "")).toEqual([]);
    }
    expect(rebekah?.prompt.adult).toBe(
      "At the well, Abraham’s servant asked the LORD to show kindness to his master and named a sign. After Rebekah did exactly that, he worshiped. What did he bless the LORD for not forsaking toward his master?",
    );

    for (const token of ["____", "{blank}", "[blank]", "…"]) {
      const html = markup(`Before ${token} after`);
      expect(html, token).toContain('data-testid="prompt-blank"');
      expect(html, token).not.toContain(token);
      expect(html.indexOf("Before"), token).toBeLessThan(html.indexOf("prompt-blank"));
      expect(html.indexOf("prompt-blank"), token).toBeLessThan(html.indexOf("after"));
    }
  });
});
