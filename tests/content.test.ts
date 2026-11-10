import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { linesForPathPlay, pickMascotLine, selectPlacementQuestions } from "@/lib/game";
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

    const rooted = pathFile.stages.find((stage) => stage.stage === "Rooted");
    const rootedBadges = rooted?.badges ?? [];
    const rootedIds = rootedBadges.flatMap((badge) => badge.questionIds);
    const oldJosephIds = [
      "c1-gen-0003",
      "c1-gen-0004",
      "c1-gen-0005",
      "c1-gen-0007",
      "c1-gen-0008",
      "c1-gen-0009",
      "c1-gen-0012",
      "c1-gen-0017",
      "c1-gen-0019",
    ];
    expect(rootedBadges).toHaveLength(25);
    expect(rootedBadges.every((badge) => badge.questionIds.length === 8)).toBe(true);
    expect(rootedIds).toHaveLength(200);
    expect(new Set(rootedIds).size).toBe(200);
    expect(rootedBadges.find((badge) => badge.id === "rooted-eden")?.questionIds).toEqual([
      "c1-gen-0036",
      "c1-gen-0037",
      "c1-gen-0038",
      "c1-gen-0039",
      "c1-gen-0040",
      "c1-gen-0041",
      "c1-gen-0042",
      "c2-gen-0001",
    ]);
    expect(rootedBadges.find((badge) => badge.id === "rooted-joseph")?.questionIds).toEqual([
      "c1-gen-0050",
      "c1-gen-0051",
      "c1-gen-0052",
      "c1-gen-0053",
      "c1-gen-0054",
      "c1-gen-0055",
      "c1-gen-0056",
      "c2-gen-0003",
    ]);
    expect(rootedIds.some((id) => oldJosephIds.includes(id))).toBe(false);
    const baptism = rootedBadges.find((badge) => badge.id === "rooted-baptism")?.questionIds ?? [];
    expect(baptism).toContain("c2-act-0002");
    expect(baptism).not.toContain("c2-act-0001");
    expect(rootedBadges.find((badge) => badge.id === "rooted-i-am")?.questionIds).toContain("c2-jhn-0001");

    const growing = pathFile.stages.find((stage) => stage.stage === "Growing");
    const growingBadges = growing?.badges ?? [];
    const growingIds = growingBadges.flatMap((badge) => badge.questionIds);
    expect(growingBadges).toHaveLength(27);
    expect(growingBadges.every((badge) => badge.questionIds.length === 8)).toBe(true);
    expect(growingIds).toHaveLength(216);
    expect(new Set(growingIds).size).toBe(216);
    expect(growingBadges.find((badge) => badge.id === "growing-wilderness")?.questionIds).toEqual([
      "c1-num-0001",
      "c1-num-0002",
      "c2-num-0002",
      "c2-num-0003",
      "c2-num-0004",
      "c2-num-0005",
      "c2-num-0006",
      "c2-num-0007",
    ]);
    expect(growingBadges.find((badge) => badge.id === "growing-isaiah-king")?.questionIds).toEqual([
      "c1-isa-0004",
      "c1-isa-0005",
      "c2-isa-0007",
      "c2-isa-0008",
      "c2-isa-0009",
      "c2-isa-0010",
      "c2-isa-0011",
      "c2-isa-0012",
    ]);
    expect(growingIds).not.toContain("c2-num-0001");
    expect(growingIds).not.toContain("c1-isa-0001");
    expect(growingIds).not.toContain("c3-rev-0001");
    expect(growingIds).not.toContain("c2-rev-0001");
    expect(growingIds).not.toContain("c2-jhn-0001");
    expect(growingIds).not.toContain("c2-act-0001");
    expect(growingIds).not.toContain("c2-act-0002");

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
    expect(pickMascotLine(linesForPathPlay(lines), "agnes", "correct", "child", { questionId: "c1-gen-0020" })?.text).toBe(
      "This is the very beginning of God's story. Let's read Genesis 1:3.",
    );
  });

  it("plays the approved Sprout line after every answer", () => {
    const { lines } = loadCatalog();
    const pathFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/knowledge_path.json"), "utf8")) as {
      stages: { stage: string; badges: { questionIds: string[] }[] }[];
    };
    const sproutIds =
      pathFile.stages.find((stage) => stage.stage === "Sprout")?.badges.flatMap((badge) => badge.questionIds) ?? [];
    expect(sproutIds).toHaveLength(136);
    const pathLines = linesForPathPlay(lines);
    const moments = ["wrong_intro", "correct", "correct_after_retry"] as const;
    const mascots = ["judah", "agnes", "shalom", "zion", "hunter"] as const;
    const approved: Record<(typeof mascots)[number], Record<string, string>> = {
      judah: {},
      agnes: {},
      shalom: {},
      zion: {},
      hunter: {},
    };

    for (const mascot of mascots) {
      const file = path.join(process.cwd(), "content/mascots", mascot, "sprout_lines.json");
      const source = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
      approved[mascot] = source;
      expect(Object.keys(source)).toHaveLength(sproutIds.length);
      expect(new Set(Object.keys(source))).toEqual(new Set(sproutIds));
      const owned = lines.filter(
        (line) =>
          line.mascot === mascot &&
          sproutIds.includes(line.question_id ?? "") &&
          line.id.startsWith(`${mascot}-sprout-`),
      );
      expect(owned).toHaveLength(136 * moments.length);
      expect(new Set(owned.map((line) => line.text)).size).toBe(136);
      expect(
        owned.every(
          (line) => line.audience === "all" && line.audio_file === null && line.text === source[line.question_id ?? ""],
        ),
      ).toBe(true);
    }

    for (const id of sproutIds) {
      for (const mascot of mascots) {
        const spoken = moments.map((moment) => pickMascotLine(pathLines, mascot, moment, "adult", { questionId: id }));
        expect(spoken.every((line) => line?.text === approved[mascot][id] && line.question_id === id && line.audience === "all")).toBe(
          true,
        );
        expect(pickMascotLine(pathLines, mascot, "correct", "child", { questionId: id })?.text).toBe(approved[mascot][id]);
        expect(pickMascotLine(pathLines, mascot, "wrong_intro", "older", { questionId: id })?.text).toBe(approved[mascot][id]);
      }
    }

    expect(approved.agnes["c1-mat-0009"]).toBe("Jesus was on His way to be baptized. Let's read Matthew 3:13 together.");
    expect(approved.judah["c1-mat-0009"]).toBe("Jesus made a journey to meet John at the water. Let's read Matthew 3:13.");
    expect(approved.shalom["c1-mat-0009"]).toBe(
      "Jesus was on a long walk to meet John. See where that trip began in Matthew 3:13.",
    );
    expect(approved.zion["c1-mat-0009"]).toBe("Jesus came to meet John. See where He traveled from in Matthew 3:13.");
    expect(approved.hunter["c1-mat-0009"]).toBe("Jesus made a long walk to meet John. Matthew 3:13 says where He started.");
    expect(approved.agnes["c1-dan-0001"]).toBe("Daniel spent the night in the lions' den. Let's read Daniel 6:22.");
    expect(pickMascotLine(lines, "agnes", "wrong_intro", "child", { questionId: "c1-dan-0001" })?.text).toBe(
      "That's okay, friend. Let's read Daniel 6:22 together and look for who God sent.",
    );
    expect(pickMascotLine(pathLines, "agnes", "correct_after_retry", "older", { questionId: "c1-dan-0001" })?.text).toBe(
      approved.agnes["c1-dan-0001"],
    );
  });

  it("plays the approved Rooted line after every answer", () => {
    const { lines } = loadCatalog();
    const pathFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/knowledge_path.json"), "utf8")) as {
      stages: { stage: string; badges: { id: string; questionIds: string[] }[] }[];
    };
    const rootedIds =
      pathFile.stages.find((stage) => stage.stage === "Rooted")?.badges.flatMap((badge) => badge.questionIds) ?? [];
    expect(rootedIds).toHaveLength(200);
    const pathLines = linesForPathPlay(lines);
    const moments = ["wrong_intro", "correct", "correct_after_retry"] as const;
    const mascots = ["judah", "agnes", "shalom", "zion", "hunter"] as const;
    const approved: Record<(typeof mascots)[number], Record<string, string>> = {
      judah: {},
      agnes: {},
      shalom: {},
      zion: {},
      hunter: {},
    };

    for (const mascot of mascots) {
      const file = path.join(process.cwd(), "content/mascots", mascot, "rooted_lines.json");
      const source = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
      approved[mascot] = source;
      expect(Object.keys(source)).toHaveLength(rootedIds.length);
      expect(new Set(Object.keys(source))).toEqual(new Set(rootedIds));
      const owned = lines.filter(
        (line) =>
          line.mascot === mascot &&
          rootedIds.includes(line.question_id ?? "") &&
          line.id.startsWith(`${mascot}-rooted-`),
      );
      expect(owned).toHaveLength(200 * moments.length);
      expect(new Set(owned.map((line) => line.text)).size).toBe(200);
      expect(
        owned.every(
          (line) => line.audience === "all" && line.audio_file === null && line.text === source[line.question_id ?? ""],
        ),
      ).toBe(true);
    }

    const playback = lines.filter((line) => line.id.includes("-rooted-"));
    expect(playback).toHaveLength(200 * mascots.length * moments.length);
    expect(new Set(playback.map((line) => `${line.mascot}:${line.question_id}`)).size).toBe(1000);
    expect(lines.filter((line) => line.id.includes("-seed-"))).toHaveLength(72 * mascots.length * moments.length);
    expect(lines.filter((line) => line.id.includes("-sprout-"))).toHaveLength(136 * mascots.length * moments.length);
    expect(lines.some((line) => line.id === "agnes-sprout-correct-c1-dan-0001")).toBe(true);

    for (const id of rootedIds) {
      for (const mascot of mascots) {
        const spoken = moments.map((moment) => pickMascotLine(pathLines, mascot, moment, "adult", { questionId: id }));
        expect(spoken.every((line) => line?.text === approved[mascot][id] && line.question_id === id && line.audience === "all")).toBe(
          true,
        );
        expect(pickMascotLine(pathLines, mascot, "correct", "child", { questionId: id })?.text).toBe(approved[mascot][id]);
        expect(pickMascotLine(pathLines, mascot, "wrong_intro", "older", { questionId: id })?.text).toBe(approved[mascot][id]);
        expect(pickMascotLine(pathLines, mascot, "correct_after_retry", "teen", { questionId: id })?.text).toBe(
          approved[mascot][id],
        );
      }
    }

    expect(approved.agnes["c1-gen-0036"]).toBe(
      "In the garden, the woman heard a question about what God had said. Let's read Genesis 3:1 together.",
    );
    expect(approved.judah["c2-act-0002"]).toBe(
      "After baptism, the Ethiopian went on his way. After baptism, the jailer brought Paul and Silas home. Let's read what both verses share, in Acts 8:39 and 16:34.",
    );
    expect(approved.agnes["c2-jhn-0001"]).toBeTruthy();
    expect(approved.agnes["c2-act-0001"]).toBeUndefined();
    expect(approved.agnes["c2-jhn-0099"]).toBeUndefined();
    expect(approved.agnes["c1-gen-0003"]).toBeUndefined();
    expect(pickMascotLine(pathLines, "agnes", "wrong_intro", "child", { questionId: "c2-act-0002" })?.text).toBe(
      approved.agnes["c2-act-0002"],
    );
    expect(pickMascotLine(pathLines, "hunter", "correct", "older", { questionId: "c1-gen-0036" })?.text).toBe(
      approved.hunter["c1-gen-0036"],
    );
    expect(pickMascotLine(pathLines, "shalom", "correct_after_retry", "adult", { questionId: "c2-jhn-0001" })?.text).toBe(
      approved.shalom["c2-jhn-0001"],
    );
    expect(pickMascotLine(lines, "agnes", "correct", "child", { questionId: "c1-gen-0020" })?.text).toBe(
      "This is the very beginning of God's story. Let's read Genesis 1:3.",
    );
  });

  it("keeps each rooted line file byte for byte", () => {
    const hashes: Record<string, string> = {
      agnes: "a2eea2a1624602370a402ed7963a9434ffd34e748772bc804b334eb3aea6995b",
      hunter: "5b4c4c54c6c898645a64db9fb1cb5556be9dac5ea6a43b792c5e5d3eaaba1f5f",
      judah: "dd7dae3d7442d25693d67440d00a16033306fe2e61789704490ee02b200341d2",
      shalom: "e338dde2d65ef9c66a7a0271d68ad179801097e1ac8ad119ca399d261a26ec86",
      zion: "76381c0a304d54fb4060b630e939530d93d79f23857953ca787dcd88f94338ee",
    };
    for (const [mascot, hash] of Object.entries(hashes)) {
      const file = path.join(process.cwd(), "content/mascots", mascot, "rooted_lines.json");
      expect(createHash("sha256").update(fs.readFileSync(file)).digest("hex")).toBe(hash);
    }
  });

  it("keeps each sprout line file byte for byte", () => {
    const hashes: Record<string, string> = {
      agnes: "98c0c4c69461249406973635cd2739c13b3aa8dd08217c1b5505df6a012043ec",
      hunter: "050b1d37fd9da4ac6e7485af85be22e5a02b7859ef9d10943effe2c1604b81df",
      judah: "a85ca2d9e8ed6e075e6d83cfad725afc6da68fccd1e8933ea9af7e294cdbfefa",
      shalom: "2a3b5f8fcd618e8d9c5ebe5e6de94300febf5a84ea232cd2e1f1e33e1eadb86d",
      zion: "5165b36c71d322d82fd2056fc1cc0f000c59802438b45dcb123c54d80a4c29f2",
    };
    for (const [mascot, hash] of Object.entries(hashes)) {
      const file = path.join(process.cwd(), "content/mascots", mascot, "sprout_lines.json");
      expect(createHash("sha256").update(fs.readFileSync(file)).digest("hex")).toBe(hash);
    }
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

  it("fails when a Sprout question is missing one guide's answer line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes", "sprout_lines.json");
    const lines = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    delete lines["c1-mat-0009"];
    fs.writeFileSync(file, JSON.stringify(lines));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Sprout question c1-mat-0009 is missing a correct line for agnes");
  });

  it("fails when a Rooted question is missing one guide's answer line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes", "rooted_lines.json");
    const lines = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    delete lines["c2-act-0002"];
    fs.writeFileSync(file, JSON.stringify(lines));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Rooted question c2-act-0002 is missing a correct line for agnes");
    expect(result.errors).toContain("Rooted question c2-act-0002 is missing a wrong_intro line for agnes");
    expect(result.errors).toContain("Rooted question c2-act-0002 is missing a correct_after_retry line for agnes");
  });

  it("fails when a rooted line names a question outside Rooted", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes", "rooted_lines.json");
    const lines = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    lines["c1-gen-0020"] = "This seed question does not belong in the rooted file.";
    lines["c1-dan-0001"] = "This sprout question does not belong in the rooted file.";
    lines["c1-missing-0001"] = "Nobody wrote this question.";
    lines["c2-jhn-0099"] = "The old placeholder does not need a Rooted line.";
    fs.writeFileSync(file, JSON.stringify(lines));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("content/mascots/agnes/rooted_lines.json: c1-gen-0020 is not a Rooted question");
    expect(result.errors).toContain("content/mascots/agnes/rooted_lines.json: c1-dan-0001 is not a Rooted question");
    expect(result.errors).toContain("content/mascots/agnes/rooted_lines.json: c1-missing-0001 references unknown question");
    expect(result.errors).toContain("content/mascots/agnes/rooted_lines.json: c2-jhn-0099 is not a Rooted question");
  });

  it("fails when a sprout line names a question outside Sprout", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bible-trivia-"));
    fs.cpSync(path.join(process.cwd(), "content"), path.join(dir, "content"), { recursive: true });
    const file = path.join(dir, "content", "mascots", "agnes", "sprout_lines.json");
    const lines = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    lines["c1-gen-0020"] = "This seed question does not belong in the sprout file.";
    lines["c1-missing-0001"] = "Nobody wrote this question.";
    fs.writeFileSync(file, JSON.stringify(lines));
    const result = validateContentTree(dir);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("content/mascots/agnes/sprout_lines.json: c1-gen-0020 is not a Sprout question");
    expect(result.errors).toContain("content/mascots/agnes/sprout_lines.json: c1-missing-0001 references unknown question");
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
