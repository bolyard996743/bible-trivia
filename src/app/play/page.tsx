import { Suspense } from "react";
import { PlayClient } from "@/components/PlayClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";
import { questionsForBadgeRun } from "@/lib/game/badges";
import { linesForBadgePlay } from "@/lib/game/mascot";
import { findPathBadge } from "@/lib/game/path";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ badge?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.badge;
  const badgeId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const catalog = loadCatalog();
  const badge = findPathBadge(badgeId);
  const questions = badge ? questionsForBadgeRun(catalog.questions, badge) : catalog.questions;
  const lines = badge ? linesForBadgePlay(catalog.lines, badge.questionIds) : catalog.lines;
  return (
    <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
      <PlayClient
        questions={questionsForDisplay(questions)}
        lines={lines}
        audioFiles={catalog.audioFiles}
      />
    </Suspense>
  );
}
