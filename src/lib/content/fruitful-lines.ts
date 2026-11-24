import fs from "fs";
import path from "path";
import { MASCOT_IDS, type MascotId, type MascotLine } from "../game/types";
import { ANSWER_MOMENTS } from "./sprout-lines";

export type FruitfulLineRead = {
  lines: MascotLine[];
  errors: string[];
  /** Mascots whose line file parsed as an object. */
  loaded: MascotId[];
};

export function fruitfulLinesPath(mascot: MascotId): string {
  return path.posix.join("content/mascots", mascot, "fruitful_lines.json");
}

export function fruitfulILinesPath(mascot: MascotId): string {
  return path.posix.join("content/mascots", mascot, "fruitful_i_lines.json");
}

/**
 * One approved string becomes the three answer lines Seed already stores.
 * There is no recording yet, so audio_file stays null.
 */
export function expandFruitfulLine(mascot: MascotId, questionId: string, text: string): MascotLine[] {
  return ANSWER_MOMENTS.map((moment) => ({
    id: `${mascot}-fruitful-${moment.replace(/_/g, "-")}-${questionId}`,
    moment,
    audience: "all" as const,
    text,
    audio_file: null,
    question_id: questionId,
    mascot,
  }));
}

function readFruitfulLineMaps(root: string, pathFor: (mascot: MascotId) => string): FruitfulLineRead {
  const errors: string[] = [];
  const lines: MascotLine[] = [];
  const loaded: MascotId[] = [];

  for (const mascot of MASCOT_IDS) {
    const rel = pathFor(mascot);
    const full = path.join(root, rel);
    let raw: string;
    try {
      raw = fs.readFileSync(full, "utf8");
    } catch (error) {
      const missing = typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
      const message = error instanceof Error ? error.message : "Could not read file";
      errors.push(missing ? `${rel}: file is missing` : `${rel}: ${message}`);
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(raw) as unknown;
    } catch (error) {
      errors.push(`${rel}: ${error instanceof Error ? error.message : "Invalid JSON"}`);
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${rel}: expected an object mapping question id to one line`);
      continue;
    }
    loaded.push(mascot);
    for (const [questionId, text] of Object.entries(value)) {
      if (typeof text !== "string" || text.length === 0) {
        errors.push(`${rel}: ${questionId} must be a non-empty string`);
        continue;
      }
      lines.push(...expandFruitfulLine(mascot, questionId, text));
    }
  }

  return { lines, errors, loaded };
}

export function readFruitfulLineFiles(root: string): FruitfulLineRead {
  return readFruitfulLineMaps(root, fruitfulLinesPath);
}

/** Batch I lines sit beside fruitful_lines.json and expand the same way. */
export function readFruitfulILineFiles(root: string): FruitfulLineRead {
  return readFruitfulLineMaps(root, fruitfulILinesPath);
}
