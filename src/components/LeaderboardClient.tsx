"use client";

import Link from "next/link";
import { MascotMark } from "@/components/MascotMark";
import { LEADERBOARD_NOTE, STARTING_REASSURANCE } from "@/lib/copy";
import { pickMascotLine } from "@/lib/game";
import { MASCOTS, type MascotLine } from "@/lib/game/types";
import { useProfile } from "@/lib/use-profile";

export function LeaderboardClient({ lines }: { lines: MascotLine[] }) {
  const { state, ready } = useProfile();
  const mascot = state?.mascot ?? "shalom";
  const age = state?.ageGroup ?? "adult";
  const line = pickMascotLine(lines, mascot, "leaderboard_reassurance", age, { random: () => 0 });

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-semibold text-grove-deep">Leaderboards</h1>
      <p className="text-lg text-ink" data-testid="leaderboard-placeholder">
        {LEADERBOARD_NOTE}
      </p>
      <p className="text-lg text-ink">{STARTING_REASSURANCE}</p>
      <div className="flex gap-3 rounded-3xl border border-line bg-card p-5">
        <MascotMark mascot={mascot} />
        <div>
          <p className="text-base text-ink-soft">{MASCOTS[mascot].name}</p>
          <p className="text-lg text-ink">{line?.text}</p>
        </div>
      </div>
      <p className="text-base text-ink-soft">
        Different starting points, same goal — knowing God&apos;s Word better. Keep going, you are learning.
      </p>
      <Link href={state?.placementComplete ? "/home" : "/"} className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Back
      </Link>
    </section>
  );
}
