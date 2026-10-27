import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { explanationRevealIssues } from "@/lib/game/reveal";
import { MOMENTS } from "@/lib/game/types";
import { loadCatalog } from "@/lib/content/load";
import { questionBatchSchema } from "@/lib/content/schema";
import { validateContentTree } from "@/lib/content/validate";

describe("sample content", () => {
  const result = validateContentTree(process.cwd());

  it("passes the schema check used by the build", () => {
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("covers both testaments, every tier, and draft placeholder review", () => {
    const { questions, lines } = loadCatalog();
    expect(questions.length).toBeGreaterThanOrEqual(12);
    expect(questions.length).toBeLessThanOrEqual(15);
    expect(new Set(questions.map((question) => question.testament))).toEqual(new Set(["OT", "NT"]));
    expect(new Set(questions.map((question) => question.tier))).toEqual(
      new Set(["foundation", "intermediate", "advanced", "expert"]),
    );
    expect(questions.every((question) => question.review.status === "draft")).toBe(true);
    expect(
      questions.every((question) =>
        question.teaching.verses.every((verse) => verse.translation === "NKJV" && verse.text.length > 0),
      ),
    ).toBe(true);
    expect(
      questions.some(
        (question) => question.prompt.child && question.prompt.teen && question.prompt.adult && question.prompt.older,
      ),
    ).toBe(true);
    expect(questions.some((question) => question.type === "true_false")).toBe(true);
    expect(questions.some((question) => question.type === "multiple_choice")).toBe(true);
    expect(questions.flatMap((question) => explanationRevealIssues(question))).toEqual([]);

    for (const mascot of ["judah", "agnes", "shalom", "zion", "hunter"]) {
      for (const moment of MOMENTS) {
        const matching = lines.filter((line) => line.mascot === mascot && line.moment === moment);
        expect(matching.length).toBeGreaterThanOrEqual(2);
        expect(matching.some((line) => line.audience === "all")).toBe(true);
      }
    }

    const hunter = lines.filter((line) => line.mascot === "hunter").map((line) => line.text).join("\n");
    expect(hunter.toLowerCase()).not.toContain("swallowed jonah");
    expect(hunter.toLowerCase()).not.toContain("i swallowed");
  });
});

describe("schema rejects a bad file", () => {
  it("fails a batch that breaks the question rules", () => {
    const parsed = questionBatchSchema.safeParse({
      format_version: 1,
      batch_id: "c1-bad-001",
      author: "Sample",
      questions: [
        {
          id: "bad",
          cycle: 1,
          tier: "foundation",
          testament: "OT",
          book: "Genesis",
          section: "Genesis 1-11",
          topics: ["creation"],
          placement_eligible: true,
          type: "multiple_choice",
          prompt: { child: "Missing adult" },
          choices: [{ id: "a", text: "Only one" }],
          answer: "z",
          teaching: {
            verses: [],
            explanation: { adult: "Because" },
            takeaway: "Takeaway",
          },
          review: { status: "draft", notes: "" },
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("fails the tree when a content file is invalid", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "content", "questions", "c9-bad-001.json"),
      JSON.stringify({ format_version: 1, batch_id: "c9-bad-001", author: "Sample", questions: [] }),
    );
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("c9-bad-001.json"))).toBe(true);
  });

  it("fails when an explanation contains the correct choice", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "questions", "c1-genesis-001.json");
    const batch = JSON.parse(fs.readFileSync(file, "utf8")) as {
      questions: { id: string; teaching: { explanation: { adult: string } } }[];
    };
    const creation = batch.questions.find((question) => question.id === "c1-gen-0001");
    creation!.teaching.explanation.adult = "The correct answer is God.";
    fs.writeFileSync(file, JSON.stringify(batch));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("c1-gen-0001") && error.includes("God"))).toBe(true);
  });

  it("fails when Hunter states that he swallowed Jonah", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "hunter-001.json");
    const batch = JSON.parse(fs.readFileSync(file, "utf8")) as {
      lines: { id: string; text: string }[];
    };
    batch.lines[0]!.text = "I swallowed Jonah, and then I learned.";
    fs.writeFileSync(file, JSON.stringify(batch));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("swallowed Jonah"))).toBe(true);
  });
});
