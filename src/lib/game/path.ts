import pathFile from "../../../content/knowledge_path.json";
import type { KnowledgeStage } from "./types";

/**
 * How the next stage opens. This is the one switch for that rule, and it is still pending approval.
 * Change `advanceRule` in content/knowledge_path.json.
 *
 * every-badge: every badge in the stage must be earned, including badges that have no questions yet.
 * badges-with-questions: only badges that already list question ids must be earned.
 */
export const ADVANCE_RULES = ["every-badge", "badges-with-questions"] as const;
export type AdvanceRule = (typeof ADVANCE_RULES)[number];

export type PathBadge = {
  id: string;
  name: string;
  art: string;
  questionIds: string[];
};

export type PathStage = {
  stage: KnowledgeStage;
  books: string[];
  badges: PathBadge[];
};

export type KnowledgePathFile = {
  version: 1;
  advanceRule: AdvanceRule;
  stages: PathStage[];
};

export const knowledgePath = pathFile as KnowledgePathFile;

/**
 * Saved progress may still name a badge by an id that was renamed in place.
 * Reading maps the old id onto the current badge. No stored row is rewritten by a migration.
 */
export const BADGE_ID_ALIASES: Record<string, string> = {
  "fruitful-song-of-solomon-love-is-strong-narrow-careful-sc": "fruitful-song-of-solomon",
};

export function canonicalBadgeId(id: string): string {
  return BADGE_ID_ALIASES[id] ?? id;
}

export function stagePath(stage: KnowledgeStage, path: KnowledgePathFile = knowledgePath): PathStage | null {
  return path.stages.find((item) => item.stage === stage) ?? null;
}

export function findPathBadge(id: string, path: KnowledgePathFile = knowledgePath): PathBadge | null {
  const wanted = canonicalBadgeId(id);
  for (const stage of path.stages) {
    const badge = stage.badges.find((item) => item.id === wanted);
    if (badge) return badge;
  }
  return null;
}

export function badgePlayHref(id: string): string {
  return `/play?badge=${encodeURIComponent(id)}`;
}
