"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KnowledgePath } from "@/components/KnowledgePath";
import { MascotMark } from "@/components/MascotMark";
import { STARTING_REASSURANCE } from "@/lib/copy";
import { pickMascotLine } from "@/lib/game";
import { currentSection } from "@/lib/game/progression";
import { MASCOTS, TIER_LABELS, type MascotLine, type Question } from "@/lib/game/types";
import { useProfile } from "@/lib/use-profile";

export function ResultsClient({ questions, lines }: { questions: Question[]; lines: MascotLine[] }) {
  const router = useRouter();
  const { state, ready } = useProfile();

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete || !state.placement) router.replace("/placement");
  }, [ready, state, router]);

  if (!ready || !state?.placement) return <p className="text-lg text-ink-soft">Opening…</p>;

  const line = pickMascotLine(lines, state.mascot, "placement_result", state.ageGroup, { random: () => 0 });
  const section = currentSection(questions, state.progress);

  return (
    <section className="grid gap-6">
      <h1 className="text-3xl font-semibold text-grove-deep">Your starting place</h1>
      <p className="text-lg text-ink" data-testid="reassurance">
        {STARTING_REASSURANCE}
      </p>
      <div className="flex gap-3 rounded-3xl border border-line bg-card p-5">
        <MascotMark mascot={state.mascot} size="lg" />
        <div>
          <p className="text-base text-ink-soft">{MASCOTS[state.mascot].name}</p>
          <p className="text-lg text-ink">{line?.text}</p>
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-card p-5">
        <p className="text-lg text-ink">
          We will begin at <span className="font-semibold">Cycle {state.placement.cycle}</span>,{" "}
          <span className="font-semibold">{TIER_LABELS[state.placement.tier]}</span>
          {section ? (
            <>
              , in <span className="font-semibold">{section}</span>
            </>
          ) : null}
          .
        </p>
        <p className="mt-2 text-base text-ink-soft">
          Your private path starts at {state.placement.stage}. That is a place to grow from, not a rank.
        </p>
      </div>
      <KnowledgePath stage={state.placement.stage} />
      <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Go to your path
      </Link>
    </section>
  );
}
