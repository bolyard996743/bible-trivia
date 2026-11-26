"use server";

import { loadCatalog } from "@/lib/content/load";
import { stageVerse } from "@/lib/game/stage-verse";
import { KNOWLEDGE_PATH, type KnowledgeStage } from "@/lib/game/types";

/** A verse reference for the stage that just opened. The question and its answer stay on the server. */
export async function openStageVerseAction(stage: string): Promise<{ ref: string } | null> {
  if (!KNOWLEDGE_PATH.includes(stage as KnowledgeStage)) return null;
  const verse = stageVerse(loadCatalog().questions, stage as KnowledgeStage);
  if (!verse) return null;
  return { ref: verse.ref };
}
