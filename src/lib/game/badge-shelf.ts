import { badgeEarned, visibleBadges, visibleMapStages } from "./badges";
import { isBadgeWaiting } from "./badge-retry";
import { badgePlayHref, knowledgePath, stagePath, type KnowledgePathFile } from "./path";
import type { GameProgress, KnowledgeStage, Question } from "./types";

/** Shown when a shelf badge is still open. It does not scold. */
export const SHELF_NOT_EARNED = "Not earned yet.";

/** The only play link on an unearned shelf badge. */
export const SHELF_PLAY = "Play this badge";

export type ShelfSlotStatus = "earned" | "playable" | "locked";

/**
 * One badge on the shelf.
 * `ref` is set only after the badge is earned. An unearned slot never carries a verse,
 * a prompt, choices, or an answer.
 */
export type ShelfSlot = {
  id: string;
  name: string;
  art: string;
  status: ShelfSlotStatus;
  ref?: string;
};

export type ShelfStageGroup = {
  stage: KnowledgeStage;
  earned: number;
  total: number;
  slots: ShelfSlot[];
};

export function shelfCountLabel(earned: number, total: number): string {
  return `${earned} of ${total}`;
}

/** A play link exists only while the badge can be tried right now. */
export function shelfPlayHref(slot: Pick<ShelfSlot, "id" | "status">): string | null {
  if (slot.status !== "playable") return null;
  return badgePlayHref(slot.id);
}

function verseRef(questionIds: readonly string[], byId: Map<string, Question>): string | null {
  for (const id of questionIds) {
    const ref = byId.get(id)?.teaching.verses.find((verse) => verse.ref.trim().length > 0)?.ref.trim();
    if (ref) return ref;
  }
  return null;
}

function slotStatus(progress: GameProgress, badgeId: string, earned: boolean, now: Date): ShelfSlotStatus {
  if (earned) return "earned";
  if (isBadgeWaiting(progress, badgeId, now)) return "locked";
  return "playable";
}

/**
 * Every badge slot on each stage the player has already reached.
 * Later stages are left out. The slots are the same badges as the 218-badge path.
 * Badges that are still being written (no questions yet) stay off the shelf.
 */
export function shelfStages(
  progress: GameProgress,
  questions: readonly Question[],
  now: Date = new Date(),
  path: KnowledgePathFile = knowledgePath,
): ShelfStageGroup[] {
  const byId = new Map<string, Question>();
  for (const question of questions) {
    if (!byId.has(question.id)) byId.set(question.id, question);
  }
  const groups: ShelfStageGroup[] = [];
  for (const stage of visibleMapStages(progress)) {
    const badges = visibleBadges(stagePath(stage, path)?.badges ?? []);
    const slots = badges.map((badge) => {
      const earned = badgeEarned(progress, badge);
      const status = slotStatus(progress, badge.id, earned, now);
      const slot: ShelfSlot = { id: badge.id, name: badge.name, art: badge.art, status };
      if (status === "earned") {
        const ref = verseRef(badge.questionIds, byId);
        if (ref) slot.ref = ref;
      }
      return slot;
    });
    const earned = slots.filter((slot) => slot.status === "earned").length;
    groups.push({ stage, earned, total: slots.length, slots });
  }
  return groups;
}
