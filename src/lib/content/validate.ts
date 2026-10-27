import fs from "fs";
import path from "path";
import { MASCOT_IDS, MOMENTS } from "../game/types";
import { mascotBatchSchema, questionBatchSchema } from "./schema";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  questionCount: number;
  lineCount: number;
};

const QUESTION_FILE = /^c\d+-[a-z0-9]+-\d+\.json$/;
const MASCOT_FILE = /^(judah|agnes|shalom|zion|hunter)-\d+\.json$/;

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
    }
  }

  const mascotFiles = fs
    .readdirSync(mascotsDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const seenMascots = new Set<string>();

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
    for (const moment of MOMENTS) {
      const lines = result.data.lines.filter((line) => line.moment === moment);
      if (lines.length < 2) {
        errors.push(`${file}: moment "${moment}" needs at least two lines`);
      }
      if (!lines.some((line) => line.audience === "all")) {
        errors.push(`${file}: moment "${moment}" needs an audience "all" line`);
      }
    }
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
    }
  }

  for (const mascot of MASCOT_IDS) {
    if (!seenMascots.has(mascot)) errors.push(`Missing mascot lines for ${mascot}`);
  }

  return { ok: errors.length === 0, errors, questionCount, lineCount };
}
