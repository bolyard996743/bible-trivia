"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KnowledgePath } from "@/components/KnowledgePath";
import { MascotMark } from "@/components/MascotMark";
import { PATH_PRIVACY } from "@/lib/copy";
import { knowledgeStage, pickMascotLine } from "@/lib/game";
import { currentSection } from "@/lib/game/progression";
import { MASCOTS, TIER_LABELS, type MascotLine, type Question } from "@/lib/game/types";
import { savePlayerState } from "@/lib/account/repository";
import { todayKey } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function HomeClient({ questions, lines }: { questions: Question[]; lines: MascotLine[] }) {
  const router = useRouter();
  const { state, ready } = useProfile();
  const visitOnArrival = useRef<string | null | undefined>(undefined);
  if (state && visitOnArrival.current === undefined) {
    visitOnArrival.current = state.lastVisitedOn;
  }

  useEffect(() => {
    if (!ready) return;
    if (!state) {
      router.replace("/profile");
      return;
    }
    if (!state.placementComplete) {
      router.replace("/placement");
      return;
    }
    const today = todayKey();
    if (state.lastVisitedOn === today) return;
    savePlayerState({ ...state, lastVisitedOn: today });
  }, [ready, state, router]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const stage = knowledgeStage(state.progress.cycle, state.progress.tier);
  const section = currentSection(questions, state.progress);
  const returning = visitOnArrival.current != null && visitOnArrival.current !== todayKey();
  const line = pickMascotLine(
    lines,
    state.mascot,
    returning ? "daily_return" : "encouragement_general",
    state.ageGroup,
    { random: () => 0 },
  );

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-base text-gold">Private</p>
        <h1 className="text-3xl font-semibold text-grove-deep">Your Knowledge Path</h1>
        <p className="mt-2 text-base text-ink-soft">{PATH_PRIVACY}</p>
      </div>
      <KnowledgePath stage={stage} />
      <div className="grid gap-2 rounded-3xl border border-line bg-card p-5 text-lg">
        <p>
          Cycle {state.progress.cycle} · {TIER_LABELS[state.progress.tier]}
        </p>
        <p>{section ? `Current section: ${section}` : "More of this part is still being written."}</p>
        <p data-testid="streak">
          {state.progress.streak > 0
            ? `Streak: ${state.progress.streak} first-try correct in a row`
            : "Streak: a new one starts with the next question you know on the first try. No rush."}
        </p>
      </div>
      <div className="flex gap-3">
        <MascotMark mascot={state.mascot} />
        <p className="text-lg text-ink">
          <span className="block text-base text-ink-soft">{MASCOTS[state.mascot].name}</span>
          {line?.text}
        </p>
      </div>
      <Link href="/play" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Play
      </Link>
      <Link href="/leaderboards" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-4 text-lg text-ink">
        Leaderboards
      </Link>
    </section>
  );
}
