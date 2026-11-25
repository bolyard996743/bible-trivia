import fs from "fs";
import path from "path";
import { MASCOT_IDS, type MascotId, type MascotLine } from "../game/types";
import { ANSWER_MOMENTS } from "./sprout-lines";

export const DEEP_ROOTS_LINE_BATCHES = ["a", "b", "c", "d", "e", "f"] as const;
export type DeepRootsLineBatch = (typeof DEEP_ROOTS_LINE_BATCHES)[number];

export type DeepRootsLineRead = {
  lines: MascotLine[];
  errors: string[];
  /** Mascots whose line file for this read parsed as an object. */
  loaded: MascotId[];
};

export function deepRootsLinesPath(mascot: MascotId, batch: DeepRootsLineBatch): string {
  return path.posix.join("content/mascots", mascot, `deeproots_${batch}_lines.json`);
}

/**
 * One approved string becomes the three answer lines Seed already stores.
 * There is no recording yet, so audio_file stays null.
 */
export function expandDeepRootsLine(mascot: MascotId, questionId: string, text: string): MascotLine[] {
  return ANSWER_MOMENTS.map((moment) => ({
    id: `${mascot}-deep-roots-${moment.replace(/_/g, "-")}-${questionId}`,
    moment,
    audience: "all" as const,
    text,
    audio_file: null,
    question_id: questionId,
    mascot,
  }));
}

function readBatch(root: string, batch: DeepRootsLineBatch): DeepRootsLineRead {
  const errors: string[] = [];
  const lines: MascotLine[] = [];
  const loaded: MascotId[] = [];

  for (const mascot of MASCOT_IDS) {
    const rel = deepRootsLinesPath(mascot, batch);
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
      lines.push(...expandDeepRootsLine(mascot, questionId, text));
    }
  }

  return { lines, errors, loaded };
}

export function readDeepRootsBatch(root: string, batch: DeepRootsLineBatch): DeepRootsLineRead {
  return readBatch(root, batch);
}

/** Batches A–F sit beside one another and expand the same way as the earlier stages. */
export function readDeepRootsLineFiles(root: string): DeepRootsLineRead {
  const errors: string[] = [];
  const lines: MascotLine[] = [];
  const seen = new Map<MascotId, number>();
  for (const batch of DEEP_ROOTS_LINE_BATCHES) {
    const read = readBatch(root, batch);
    errors.push(...read.errors);
    lines.push(...read.lines);
    for (const mascot of read.loaded) seen.set(mascot, (seen.get(mascot) ?? 0) + 1);
  }
  const loaded = MASCOT_IDS.filter((mascot) => seen.get(mascot) === DEEP_ROOTS_LINE_BATCHES.length);
  return { lines, errors, loaded };
}
