"use client";

import { FetchedPassage } from "@/components/FetchedPassage";
import { MascotMark } from "@/components/MascotMark";
import { MASCOTS, type KnowledgeStage, type MascotId } from "@/lib/game/types";

export function StageUpCelebration({
  mascot,
  stage,
  verseRef,
  onContinue,
}: {
  mascot: MascotId;
  stage: KnowledgeStage;
  verseRef: string | null;
  onContinue: () => void;
}) {
  return (
    <div data-testid="stage-up" className="stage-up">
      <MascotMark mascot={mascot} size="lg" motion="celebrate" />
      <p className="text-base text-ink-soft">{MASCOTS[mascot].name}</p>
      <h1 className="text-3xl font-semibold text-grove-deep">{stage} is open</h1>
      <p className="max-w-md text-lg text-ink">A new part of the path is open.</p>
      <div className="w-full min-w-0 max-w-md text-left">
        {verseRef ? <FetchedPassage reference={verseRef} /> : <p className="text-lg text-ink">Opening this verse…</p>}
      </div>
      <button
        type="button"
        data-testid="stage-up-continue"
        onClick={onContinue}
        className="min-h-12 rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
      >
        Continue
      </button>
    </div>
  );
}
