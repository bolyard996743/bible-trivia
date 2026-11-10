import fs from "fs";
import path from "path";
import { MASCOT_IDS, type MascotId, type MascotLine } from "../game/types";
import { ANSWER_MOMENTS } from "./sprout-lines";

export type RootedLineRead = {
  lines: MascotLine[];
  errors: string[];
  /** Mascots whose rooted_lines.json parsed as an object. */
  loaded: MascotId[];
};

export function rootedLinesPath(mascot: MascotId): string {
  return path.posix.join("content/mascots", mascot, "rooted_lines.json");
}

/**
 * One approved string becomes the three answer lines Seed already stores.
 * There is no recording yet, so audio_file stays null.
 */
export function expandRootedLine(mascot: MascotId, questionId: string, text: string): MascotLine[] {
  return ANSWER_MOMENTS.map((moment) => ({
    id: `${mascot}-rooted-${moment.replace(/_/g, "-")}-${questionId}`,
    moment,
    audience: "all" as const,
    text,
    audio_file: null,
    question_id: questionId,
    mascot,
  }));
}

export function readRootedLineFiles(root: string): RootedLineRead {
  const errors: string[] = [];
  const lines: MascotLine[] = [];
  const loaded: MascotId[] = [];

  for (const mascot of MASCOT_IDS) {
    const rel = rootedLinesPath(mascot);
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
      lines.push(...expandRootedLine(mascot, questionId, text));
    }
  }

  return { lines, errors, loaded };
}
