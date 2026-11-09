import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { pickMascotLine, selectPlacementQuestions } from "@/lib/game";
import { explanationRevealIssues } from "@/lib/game/reveal";
import { MOMENTS, TIERS } from "@/lib/game/types";
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
    expect(questions.length).toBeGreaterThanOrEqual(13);
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
    expect(hunter).toContain("Don't stop down here. Three days in the dark taught me the best part comes after.");
    expect(hunter).not.toContain("Trust me, the dark is a poor place to stop");
  });

  it("uses the approved placement set in tier order and the guide's question lines", () => {
    const { questions, lines } = loadCatalog();
    const quiz = selectPlacementQuestions(questions);
    expect(quiz).toHaveLength(13);
    expect(quiz.every((question) => question.placement_eligible)).toBe(true);
    const tierIndex = quiz.map((question) => TIERS.indexOf(question.tier));
    expect(tierIndex).toEqual([...tierIndex].sort((a, b) => a - b));
    expect(quiz[0]?.id).toBe("c1-gen-0002");

    const line = pickMascotLine(lines, "judah", "wrong_intro", "adult", { questionId: "c1-gen-0002" });
    expect(line?.question_id).toBe("c1-gen-0002");
    expect(line?.audience).toBe("adult");
    expect(line?.audio_file).toBeNull();
    expect(line?.text.length).toBeGreaterThan(0);

    const childLine = pickMascotLine(lines, "agnes", "correct", "child", { questionId: "c1-luk-0001" });
    expect(childLine?.audience).toBe("child");
    expect(childLine?.question_id).toBe("c1-luk-0001");
  });

  it("plays the approved Seed line after every answer", () => {
    const { lines } = loadCatalog();
    const pathFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/knowledge_path.json"), "utf8")) as {
      stages: { stage: string; badges: { id: string; name: string; questionIds: string[] }[] }[];
    };
    const seed = pathFile.stages.find((stage) => stage.stage === "Seed");
    const badges = seed?.badges ?? [];
    const ids = badges.flatMap((badge) => badge.questionIds);
    expect(badges).toHaveLength(9);
    expect(ids).toHaveLength(72);
    expect(new Set(ids).size).toBe(72);
    expect(badges.every((badge) => badge.questionIds.length === 8)).toBe(true);

    const sprout = pathFile.stages.find((stage) => stage.stage === "Sprout");
    const sproutBadges = sprout?.badges ?? [];
    const sproutIds = sproutBadges.flatMap((badge) => badge.questionIds);
    expect(sproutBadges).toHaveLength(17);
    expect(sproutBadges.every((badge) => badge.questionIds.length === 8)).toBe(true);
    expect(sproutIds).toHaveLength(136);
    expect(new Set(sproutIds).size).toBe(136);
    expect(sproutBadges.find((badge) => badge.id === "sprout-daniel")?.questionIds).toEqual([
      "c1-dan-0002",
      "c1-dan-0003",
      "c1-dan-0004",
      "c1-dan-0005",
      "c1-dan-0006",
      "c1-dan-0007",
      "c1-dan-0008",
      "c1-dan-0001",
    ]);
    expect(sproutBadges.find((badge) => badge.id === "sprout-loves")?.questionIds).not.toContain("c1-mat-0001");
    expect(sproutIds).not.toContain("c3-eph-0001");
    expect(sproutIds).not.toContain("c3-psa-0001");
    expect(sproutBadges.find((badge) => badge.id === "sprout-books-of-the-bible-names-order-and-groups-of-boo")?.name).toBe(
      "Books of the Bible",
    );

    const moments = ["wrong_intro", "correct", "correct_after_retry"] as const;
    const mascots = ["judah", "agnes", "shalom", "zion", "hunter"] as const;
    for (const mascot of mascots) {
      const owned = lines.filter((line) => line.mascot === mascot && ids.includes(line.question_id ?? ""));
      expect(owned).toHaveLength(72 * moments.length);
      expect(new Set(owned.map((line) => line.text)).size).toBe(72);
      expect(owned.every((line) => line.audience === "all" && line.audio_file === null && line.text === line.text.trim())).toBe(
        true,
      );
    }

    for (const id of ids) {
      for (const mascot of mascots) {
        const spoken = moments.map((moment) =>
          pickMascotLine(lines, mascot, moment, "adult", { questionId: id }),
        );
        expect(spoken.every((line) => line?.question_id === id && line.audience === "all")).toBe(true);
        expect(new Set(spoken.map((line) => line?.text)).size).toBe(1);
        expect(pickMascotLine(lines, mascot, "correct", "child", { questionId: id })?.text).toBe(spoken[0]?.text);
        expect(pickMascotLine(lines, mascot, "wrong_intro", "older", { questionId: id })?.text).toBe(spoken[0]?.text);
      }
    }

    expect(pickMascotLine(lines, "agnes", "correct", "child", { questionId: "c1-gen-0020" })?.text).toBe(
      "This is the very beginning of God's story. Let's read Genesis 1:3.",
    );
    expect(pickMascotLine(lines, "judah", "wrong_intro", "teen", { questionId: "c1-gen-0020" })?.text).toBe(
      "In the beginning, God spoke. Let's read Genesis 1:3.",
    );
    expect(pickMascotLine(lines, "shalom", "correct_after_retry", "older", { questionId: "c1-gen-0020" })?.text).toBe(
      "A great hush lay over the deep before anything had its place. Let's rest in Genesis 1:3.",
    );
    expect(pickMascotLine(lines, "zion", "correct", "adult", { questionId: "c1-gen-0020" })?.text).toBe(
      "God spoke, and everything began! Hear His first words in Genesis 1:3.",
    );
    expect(pickMascotLine(lines, "hunter", "wrong_intro", "child", { questionId: "c1-gen-0020" })?.text).toBe(
      "Every story has a first word, friend. Genesis 1:3 tells what the Maker said first.",
    );
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

  it("fails when a mascot line names an unknown question", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes-seed-001.json");
    const batch = JSON.parse(fs.readFileSync(file, "utf8")) as {
      lines: { id: string; question_id: string }[];
    };
    batch.lines[0]!.question_id = "c1-missing-0001";
    fs.writeFileSync(file, JSON.stringify(batch));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("c1-missing-0001"))).toBe(true);
  });

  it("fails when a Seed question is missing one guide's answer line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes-seed-001.json");
    const batch = JSON.parse(fs.readFileSync(file, "utf8")) as {
      lines: { question_id: string; moment: string }[];
    };
    batch.lines = batch.lines.filter((line) => !(line.question_id === "c1-gen-0020" && line.moment === "correct"));
    fs.writeFileSync(file, JSON.stringify(batch));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Seed question c1-gen-0020 is missing a correct line for agnes");
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
