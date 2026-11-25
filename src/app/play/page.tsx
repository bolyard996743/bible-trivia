import { Suspense } from "react";
import Link from "next/link";
import { PlayClient } from "@/components/PlayClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";
import { BADGE_MISSING_NOTE } from "@/lib/game/badge-lock";
import { findPathBadge } from "@/lib/game/path";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ badge?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.badge;
  const badgeId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const badge = badgeId ? findPathBadge(badgeId) : null;
  if (badgeId && !badge) {
    return (
      <section className="grid gap-4" data-testid="badge-missing">
        <h1 className="text-3xl font-semibold text-grove-deep">That badge is not on the path</h1>
        <p className="text-lg text-ink">{BADGE_MISSING_NOTE}</p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to the map
        </Link>
      </section>
    );
  }

  const catalog = loadCatalog();
  if (badge) {
    return (
      <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
        <PlayClient badgeId={badge.id} questions={[]} lines={[]} audioFiles={catalog.audioFiles} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
      <PlayClient
        badgeId={null}
        questions={questionsForDisplay(catalog.questions)}
        lines={catalog.lines}
        audioFiles={catalog.audioFiles}
      />
    </Suspense>
  );
}
