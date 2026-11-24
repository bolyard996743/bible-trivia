import fs from "fs";
import path from "path";
import { z } from "zod";
import { parsePassageId } from "../bible/books";

const FILE = "content/devotions/devotions.json";

const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    reference: z.string().min(1),
    image: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/),
  })
  .strict();

const fileSchema = z
  .object({
    status: z.enum(["sample", "approved"]),
    note: z.string().min(1),
    entries: z.array(entrySchema).min(1),
  })
  .strict();

export type DevotionValidation = {
  ok: boolean;
  errors: string[];
  entryCount: number;
};

const BANNED_KEYS = ["thought", "text", "verse", "wording"] as const;

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((issue) => {
    const at = issue.path.length ? issue.path.map(String).join(".") : "file";
    return `${FILE}: ${at}: ${issue.message}`;
  });
}

/** Checks the devotion list. The home page imports the JSON and does not read it from disk. */
export function validateDevotions(root: string): DevotionValidation {
  const errors: string[] = [];
  const full = path.join(root, "content", "devotions", "devotions.json");
  let raw: string;
  try {
    raw = fs.readFileSync(full, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read file";
    return { ok: false, errors: [`${FILE}: ${message}`], entryCount: 0 };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, errors: [`${FILE}: ${message}`], entryCount: 0 };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = (value as { entries?: unknown }).entries;
    if (Array.isArray(entries)) {
      entries.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        for (const key of BANNED_KEYS) {
          if (key in entry) {
            errors.push(`${FILE}: entries.${index}.${key} is not part of the devotion format`);
          }
        }
      });
    }
  }

  const parsed = fileSchema.safeParse(value);
  if (!parsed.success) {
    errors.push(...formatIssues(parsed.error.issues));
    return { ok: false, errors, entryCount: 0 };
  }

  if (parsed.data.status === "sample" && !/sample|placeholder/i.test(parsed.data.note)) {
    errors.push(`${FILE}: a sample list must say that it is a sample or placeholder`);
  }

  const seen = new Set<string>();
  parsed.data.entries.forEach((entry, index) => {
    if (seen.has(entry.id)) errors.push(`${FILE}: entries.${index}.id duplicates ${entry.id}`);
    seen.add(entry.id);
    if (!parsePassageId(entry.reference)) {
      errors.push(`${FILE}: entries.${index}.reference is not an API.Bible passage id (${entry.reference})`);
    }
    const imagePath = path.join(root, "public", "devotion", entry.image);
    if (!fs.existsSync(imagePath)) {
      errors.push(`${FILE}: entries.${index}.image is missing (${entry.image})`);
    }
  });

  return { ok: errors.length === 0, errors, entryCount: parsed.data.entries.length };
}
