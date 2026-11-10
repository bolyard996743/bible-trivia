import fs from "fs";
import path from "path";
import { explanationRevealIssues } from "../game/reveal";
import { KNOWLEDGE_PATH, MASCOT_IDS, MOMENTS } from "../game/types";
import { ADVANCE_RULES } from "../game/path";
import { mascotBatchSchema, questionBatchSchema } from "./schema";
import { ANSWER_MOMENTS, readSproutLineFiles, sproutLinesPath } from "./sprout-lines";

const BADGE_COUNTS: Record<(typeof KNOWLEDGE_PATH)[number], number> = {
  Seed: 9,
  Sprout: 17,
  Rooted: 25,
  Growing: 27,
  Established: 29,
  Fruitful: 69,
  "Deep Roots": 42,
};

const BOOK_COUNTS: Record<(typeof KNOWLEDGE_PATH)[number], number> = {
  Seed: 8,
  Sprout: 15,
  Rooted: 24,
  Growing: 32,
  Established: 40,
  Fruitful: 60,
  "Deep Roots": 66,
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  questionCount: number;
  lineCount: number;
};

const QUESTION_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const MASCOT_FILE = /^(judah|agnes|shalom|zion|hunter)-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

const SEED_QUESTION_COUNT = 72;
const SPROUT_QUESTION_COUNT = 136;
const ROOTED_QUESTION_COUNT = 200;

/** Hunter may hint at deep water. He may not say he swallowed Jonah. */
const HUNTER_FORBIDDEN = [
  /swallow(?:ed|s|ing)?\s+jonah/i,
  /jonah\b[^.]{0,80}\bswallow/i,
  /\bi swallowed\b/i,
];

function readJson(filePath: string): { value?: unknown; error?: string } {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read file" };
  }
  try {
    return { value: JSON.parse(raw) as unknown };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

function requireStageLines(
  errors: string[],
  stage: "Seed" | "Sprout",
  ids: string[],
  expected: number,
  answerLinesByQuestion: Map<string, Map<string, Set<string>>>,
  skipMascots: ReadonlySet<string>,
) {
  if (ids.length !== expected) {
    errors.push(
      `content/knowledge_path.json: ${stage} badges should list ${expected} questions, found ${ids.length}`,
    );
  }
  for (const id of ids) {
    const byMascot = answerLinesByQuestion.get(id) ?? new Map<string, Set<string>>();
    for (const mascot of MASCOT_IDS) {
      if (skipMascots.has(mascot)) continue;
      const moments = byMascot.get(mascot) ?? new Set<string>();
      for (const moment of ANSWER_MOMENTS) {
        if (!moments.has(moment)) {
          errors.push(`${stage} question ${id} is missing a ${moment} line for ${mascot}`);
        }
      }
    }
  }
}

function formatIssues(file: string, issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((issue) => {
    const at = issue.path.length ? issue.path.map(String).join(".") : "file";
    return `${file}: ${at}: ${issue.message}`;
  });
}

export function validateContentTree(root: string): ValidationResult {
  const errors: string[] = [];
  const questionsDir = path.join(root, "content", "questions");
  const mascotsDir = path.join(root, "content", "mascots");
  const questionIds = new Map<string, string>();
  const lineIds = new Map<string, string>();
  let questionCount = 0;
  let lineCount = 0;

  if (!fs.existsSync(questionsDir)) {
    errors.push(`Missing directory ${questionsDir}`);
  }
  if (!fs.existsSync(mascotsDir)) {
    errors.push(`Missing directory ${mascotsDir}`);
  }
  if (errors.length > 0) {
    return { ok: false, errors, questionCount, lineCount };
  }

  const questionFiles = fs
    .readdirSync(questionsDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (questionFiles.length === 0) errors.push("content/questions has no JSON files");

  for (const name of questionFiles) {
    const file = path.posix.join("content/questions", name);
    if (!QUESTION_FILE.test(name)) {
      errors.push(`${file}: filename must look like c1-genesis-001.json`);
    }
    const parsed = readJson(path.join(questionsDir, name));
    if (parsed.error || parsed.value === undefined) {
      errors.push(`${file}: ${parsed.error ?? "Invalid JSON"}`);
      continue;
    }
    const result = questionBatchSchema.safeParse(parsed.value);
    if (!result.success) {
      errors.push(...formatIssues(file, result.error.issues));
      continue;
    }
    if (result.data.batch_id !== name.replace(/\.json$/, "")) {
      errors.push(`${file}: batch_id must match the filename`);
    }
    for (const question of result.data.questions) {
      questionCount += 1;
      const prior = questionIds.get(question.id);
      if (prior) errors.push(`${file}: duplicate question id ${question.id} (also in ${prior})`);
      questionIds.set(question.id, file);
      for (const issue of explanationRevealIssues(question)) {
        errors.push(`${file}: ${issue}`);
      }
    }
  }

  const mascotFiles = fs
    .readdirSync(mascotsDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const seenMascots = new Set<string>();
  const linesByMascot = new Map<string, { moment: string; audience: string }[]>();
  const answerLinesByQuestion = new Map<string, Map<string, Set<string>>>();

  for (const name of mascotFiles) {
    const file = path.posix.join("content/mascots", name);
    if (!MASCOT_FILE.test(name)) {
      errors.push(`${file}: filename must look like judah-001.json`);
    }
    const parsed = readJson(path.join(mascotsDir, name));
    if (parsed.error || parsed.value === undefined) {
      errors.push(`${file}: ${parsed.error ?? "Invalid JSON"}`);
      continue;
    }
    const result = mascotBatchSchema.safeParse(parsed.value);
    if (!result.success) {
      errors.push(...formatIssues(file, result.error.issues));
      continue;
    }
    if (!name.startsWith(`${result.data.mascot}-`)) {
      errors.push(`${file}: filename must start with the mascot id "${result.data.mascot}"`);
    }
    seenMascots.add(result.data.mascot);
    const collected = linesByMascot.get(result.data.mascot) ?? [];
    collected.push(...result.data.lines.map((line) => ({ moment: line.moment, audience: line.audience })));
    linesByMascot.set(result.data.mascot, collected);
    for (const line of result.data.lines) {
      lineCount += 1;
      const prior = lineIds.get(line.id);
      if (prior) errors.push(`${file}: duplicate line id ${line.id} (also in ${prior})`);
      lineIds.set(line.id, file);
      if (result.data.mascot === "hunter") {
        for (const pattern of HUNTER_FORBIDDEN) {
          if (pattern.test(line.text)) {
            errors.push(
              `${file}: ${line.id} states outright that Hunter swallowed Jonah`,
            );
            break;
          }
        }
      }
      if (line.question_id) {
        if (!questionIds.has(line.question_id)) {
          errors.push(`${file}: ${line.id} references unknown question ${line.question_id}`);
        }
        if (line.audience === "all" && (ANSWER_MOMENTS as readonly string[]).includes(line.moment)) {
          const byMascot = answerLinesByQuestion.get(line.question_id) ?? new Map<string, Set<string>>();
          const moments = byMascot.get(result.data.mascot) ?? new Set<string>();
          moments.add(line.moment);
          byMascot.set(result.data.mascot, moments);
          answerLinesByQuestion.set(line.question_id, byMascot);
        }
      }
    }
  }

  for (const mascot of MASCOT_IDS) {
    if (!seenMascots.has(mascot)) errors.push(`Missing mascot lines for ${mascot}`);
    const lines = linesByMascot.get(mascot) ?? [];
    for (const moment of MOMENTS) {
      const momentLines = lines.filter((line) => line.moment === moment);
      if (momentLines.length < 2) {
        errors.push(`${mascot}: moment "${moment}" needs at least two lines`);
      }
      if (!momentLines.some((line) => line.audience === "all")) {
        errors.push(`${mascot}: moment "${moment}" needs an audience "all" line`);
      }
    }
  }

  const sprout = readSproutLineFiles(root);
  errors.push(...sprout.errors);
  const sproutNoted = new Set<string>();
  for (const line of sprout.lines) {
    lineCount += 1;
    const file = sproutLinesPath(line.mascot);
    const prior = lineIds.get(line.id);
    if (prior) errors.push(`${file}: duplicate line id ${line.id} (also in ${prior})`);
    lineIds.set(line.id, file);
    const once = `${line.mascot}:${line.question_id ?? ""}`;
    if (!sproutNoted.has(once)) {
      sproutNoted.add(once);
      if (line.mascot === "hunter") {
        for (const pattern of HUNTER_FORBIDDEN) {
          if (pattern.test(line.text)) {
            errors.push(`${file}: ${line.question_id} states outright that Hunter swallowed Jonah`);
            break;
          }
        }
      }
      if (line.question_id && !questionIds.has(line.question_id)) {
        errors.push(`${file}: ${line.question_id} references unknown question`);
      }
    }
    if (
      line.question_id &&
      questionIds.has(line.question_id) &&
      line.audience === "all" &&
      (ANSWER_MOMENTS as readonly string[]).includes(line.moment)
    ) {
      const byMascot = answerLinesByQuestion.get(line.question_id) ?? new Map<string, Set<string>>();
      const moments = byMascot.get(line.mascot) ?? new Set<string>();
      moments.add(line.moment);
      byMascot.set(line.mascot, moments);
      answerLinesByQuestion.set(line.question_id, byMascot);
    }
  }
  const sproutFileMissing = new Set(MASCOT_IDS.filter((mascot) => !sprout.loaded.includes(mascot)));

  const pathFile = path.join(root, "content", "knowledge_path.json");
  const loaded = readJson(pathFile);
  if (loaded.error || loaded.value === undefined) {
    errors.push(`content/knowledge_path.json: ${loaded.error ?? "Invalid JSON"}`);
  } else {
    const file = loaded.value as {
      advanceRule?: string;
      stages?: { stage?: string; books?: string[]; badges?: { id?: string; questionIds?: string[] }[] }[];
    };
    if (!ADVANCE_RULES.includes(file.advanceRule as (typeof ADVANCE_RULES)[number])) {
      errors.push("content/knowledge_path.json: advanceRule must be every-badge or badges-with-questions");
    }
    const stages = file.stages ?? [];
    if (stages.length !== KNOWLEDGE_PATH.length) {
      errors.push(`content/knowledge_path.json: expected ${KNOWLEDGE_PATH.length} stages`);
    }
    const seenBadges = new Set<string>();
    const seenQuestions = new Set<string>();
    const seedQuestionIds: string[] = [];
    const sproutQuestionIds: string[] = [];
    const rootedQuestionIds: string[] = [];
    let badgeCount = 0;
    stages.forEach((stage, index) => {
      const expected = KNOWLEDGE_PATH[index];
      if (stage.stage !== expected) {
        errors.push(`content/knowledge_path.json: stage ${index + 1} should be ${expected ?? "missing"}`);
        return;
      }
      const badges = stage.badges ?? [];
      const books = stage.books ?? [];
      badgeCount += badges.length;
      if (badges.length !== BADGE_COUNTS[expected]) {
        errors.push(`content/knowledge_path.json: ${expected} should have ${BADGE_COUNTS[expected]} badges`);
      }
      if (books.length !== BOOK_COUNTS[expected]) {
        errors.push(`content/knowledge_path.json: ${expected} should list ${BOOK_COUNTS[expected]} books`);
      }
      for (const badge of badges) {
        if (!badge.id) {
          errors.push(`content/knowledge_path.json: ${expected} has a badge without an id`);
          continue;
        }
        if (seenBadges.has(badge.id)) errors.push(`content/knowledge_path.json: duplicate badge ${badge.id}`);
        seenBadges.add(badge.id);
        for (const id of badge.questionIds ?? []) {
          if (seenQuestions.has(id)) errors.push(`content/knowledge_path.json: ${id} is listed on more than one badge`);
          seenQuestions.add(id);
          if (!questionIds.has(id)) errors.push(`content/knowledge_path.json: ${badge.id} lists unknown question ${id}`);
          if (expected === "Seed") seedQuestionIds.push(id);
          if (expected === "Sprout") sproutQuestionIds.push(id);
          if (expected === "Rooted") rootedQuestionIds.push(id);
        }
        if (expected === "Rooted" && (badge.questionIds ?? []).length !== 8) {
          errors.push(
            `content/knowledge_path.json: ${badge.id} should list 8 questions, found ${(badge.questionIds ?? []).length}`,
          );
        }
      }
    });
    if (badgeCount !== 218) errors.push(`content/knowledge_path.json: expected 218 badges, found ${badgeCount}`);
    requireStageLines(errors, "Seed", seedQuestionIds, SEED_QUESTION_COUNT, answerLinesByQuestion, new Set());
    requireStageLines(
      errors,
      "Sprout",
      sproutQuestionIds,
      SPROUT_QUESTION_COUNT,
      answerLinesByQuestion,
      sproutFileMissing,
    );
    const sproutIds = new Set(sproutQuestionIds);
    const strayNoted = new Set<string>();
    for (const line of sprout.lines) {
      if (!line.question_id || !questionIds.has(line.question_id) || sproutIds.has(line.question_id)) continue;
      const once = `${line.mascot}:${line.question_id}`;
      if (strayNoted.has(once)) continue;
      strayNoted.add(once);
      errors.push(`${sproutLinesPath(line.mascot)}: ${line.question_id} is not a Sprout question`);
    }
    if (rootedQuestionIds.length !== ROOTED_QUESTION_COUNT) {
      errors.push(
        `content/knowledge_path.json: Rooted badges should list ${ROOTED_QUESTION_COUNT} questions, found ${rootedQuestionIds.length}`,
      );
    }
  }

  return { ok: errors.length === 0, errors, questionCount, lineCount };
}
