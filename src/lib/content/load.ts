import fs from "fs";
import path from "path";
import type { MascotLine, Question } from "../game/types";
import { mascotBatchSchema, questionBatchSchema } from "./schema";
import { validateContentTree } from "./validate";

export type Catalog = {
  questions: Question[];
  lines: MascotLine[];
  audioFiles: string[];
};

function listAudioFiles(root: string): string[] {
  const dir = path.join(root, "public", "audio");
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mp3")) {
        const rel = path.relative(path.join(root, "public"), full).split(path.sep).join("/");
        files.push(`/${rel}`);
      }
    }
  };
  walk(dir);
  return files;
}

export function loadCatalog(root = process.cwd()): Catalog {
  const check = validateContentTree(root);
  if (!check.ok) {
    throw new Error(`Content validation failed:\n${check.errors.join("\n")}`);
  }

  const questionsDir = path.join(root, "content", "questions");
  const mascotsDir = path.join(root, "content", "mascots");
  const questions: Question[] = [];
  const lines: MascotLine[] = [];
  const audioFiles = listAudioFiles(root);

  for (const name of fs.readdirSync(questionsDir).filter((file) => file.endsWith(".json")).sort()) {
    const raw = JSON.parse(fs.readFileSync(path.join(questionsDir, name), "utf8")) as unknown;
    const batch = questionBatchSchema.parse(raw);
    questions.push(...batch.questions);
  }

  for (const name of fs.readdirSync(mascotsDir).filter((file) => file.endsWith(".json")).sort()) {
    const raw = JSON.parse(fs.readFileSync(path.join(mascotsDir, name), "utf8")) as unknown;
    const batch = mascotBatchSchema.parse(raw);
    for (const line of batch.lines) {
      lines.push({ ...line, mascot: batch.mascot });
    }
  }

  return { questions, lines, audioFiles };
}
