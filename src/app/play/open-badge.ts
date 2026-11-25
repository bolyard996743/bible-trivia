"use server";

import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";
import { openBadgeRun, type BadgeRun } from "@/lib/game/badges";
import { linesForBadgePlay, linesForPathPlay } from "@/lib/game/mascot";
import type { MascotLine, Question } from "@/lib/game/types";
import type { GameProgress } from "@/lib/game/types";

export type BadgeRunResponse =
  | { status: "missing"; message: string }
  | { status: "locked"; id: string; name: string; art: string; message: string }
  | { status: "earned"; id: string; name: string; art: string }
  | { status: "ready"; id: string; name: string; art: string; questions: Question[]; lines: MascotLine[] };

/** Loads a badge run only when this progress has opened that badge. Locked runs include no questions. */
export async function openBadgeRunAction(progress: GameProgress, badgeId: string): Promise<BadgeRunResponse> {
  const catalog = loadCatalog();
  const result: BadgeRun = openBadgeRun(progress, badgeId, catalog.questions);
  if (result.status === "missing") return { status: "missing", message: result.message };
  if (result.status === "locked") {
    return {
      status: "locked",
      id: result.badge.id,
      name: result.badge.name,
      art: result.badge.art,
      message: result.message,
    };
  }
  if (result.status === "earned") {
    return { status: "earned", id: result.badge.id, name: result.badge.name, art: result.badge.art };
  }
  return {
    status: "ready",
    id: result.badge.id,
    name: result.badge.name,
    art: result.badge.art,
    questions: questionsForDisplay(result.questions),
    lines: linesForPathPlay(linesForBadgePlay(catalog.lines, result.badge.questionIds)),
  };
}
