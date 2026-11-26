"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BadgeEarnedBar } from "@/components/BadgeEarnedBar";
import { KnowledgePath } from "@/components/KnowledgePath";
import { MascotMark } from "@/components/MascotMark";
import { PATH_PRIVACY } from "@/lib/copy";
import { knowledgeStage, pickMascotLine } from "@/lib/game";
import { countCatalogBadges, countEarnedBadges } from "@/lib/game/badges";
import { currentSection } from "@/lib/game/progression";
import { MASCOTS, type MascotLine, type Question } from "@/lib/game/types";
import { ACCOUNT_DELETED_MESSAGE } from "@/lib/account/delete-account-copy";
import { savePlayerState } from "@/lib/account/repository";
import { todayKey } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function HomeClient({
  questions,
  lines,
  accountDeleted = false,
}: {
  questions: Question[];
  lines: MascotLine[];
  accountDeleted?: boolean;
}) {
  const router = useRouter();
  const { state, ready } = useProfile();
  const visitOnArrival = useRef<string | null | undefined>(undefined);
  if (state && visitOnArrival.current === undefined) {
    visitOnArrival.current = state.lastVisitedOn;
  }

  useEffect(() => {
    if (!ready) return;
    if (accountDeleted && !state?.placementComplete) return;
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
  }, [accountDeleted, ready, state, router]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (accountDeleted && !state?.placementComplete) {
    return (
      <section className="grid gap-4" data-testid="account-deleted">
        <h1 className="text-3xl font-semibold text-grove-deep">Home</h1>
        <p className="text-lg text-ink">{ACCOUNT_DELETED_MESSAGE}</p>
        <Link href="/profile" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Choose a guide
        </Link>
      </section>
    );
  }
  if (!state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const stage = state.progress.stage ?? knowledgeStage(state.progress.cycle, state.progress.tier);
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
      {accountDeleted ? (
        <p className="text-lg text-ink" data-testid="account-deleted">
          {ACCOUNT_DELETED_MESSAGE}
        </p>
      ) : null}
      <div>
        <p className="text-base text-gold">Private</p>
        <h1 className="text-3xl font-semibold text-grove-deep">Your Knowledge Path</h1>
        <p className="mt-2 text-base text-ink-soft">{PATH_PRIVACY}</p>
      </div>
      <BadgeEarnedBar earned={countEarnedBadges(state.progress)} total={countCatalogBadges()} />
      <KnowledgePath progress={{ ...state.progress, stage }} variant="reached" />
      <div className="grid gap-2 rounded-3xl border border-line bg-card p-5 text-lg">
        <p data-testid="path-position">
          {stage} · Cycle {state.progress.cycle}
        </p>
        <p>{section ? `Current section: ${section}` : "More of this part is still being written."}</p>
        <p data-testid="streak">
          {state.progress.streak > 0
            ? `Streak: ${state.progress.streak} first-try correct in a row`
            : "Streak: a new one starts with the next question you know on the first try. No rush."}
        </p>
      </div>
      <div className="flex min-w-0 gap-3">
        <MascotMark mascot={state.mascot} />
        <p className="min-w-0 text-lg text-ink [overflow-wrap:anywhere]">
          <span className="block text-base text-ink-soft">{MASCOTS[state.mascot].name}</span>
          {line?.text}
        </p>
      </div>
      <Link href="/path" data-testid="stage-map-link" className="tap inline-flex items-center justify-center rounded-2xl border border-grove px-4 text-lg text-grove-deep">
        Stage map
      </Link>
      <Link href="/play" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Play
      </Link>
      <Link href="/leaderboards" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-4 text-lg text-ink">
        Leaderboards
      </Link>
      <Link
        href="/donate"
        data-testid="home-donate"
        className="tap inline-flex min-w-11 items-center justify-center px-3 text-lg text-grove-deep underline"
      >
        Donate
      </Link>
    </section>
  );
}
