"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MascotMark } from "@/components/MascotMark";
import { pickMascotLine } from "@/lib/game";
import { MASCOTS, TIER_LABELS, type MascotLine, type Moment } from "@/lib/game/types";
import { saveState } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

function momentFor(type: string): Moment {
  if (type === "cycle_complete") return "cycle_complete";
  if (type === "level_up") return "level_up";
  if (type === "section_complete") return "section_complete";
  return "encouragement_general";
}

export function CompleteClient({ lines }: { lines: MascotLine[] }) {
  const router = useRouter();
  const { state, ready } = useProfile();

  useEffect(() => {
    if (!ready) return;
    if (!state || !state.celebration) router.replace("/home");
  }, [ready, state, router]);

  if (!ready || !state?.celebration) return <p className="text-lg text-ink-soft">Opening…</p>;

  const celebration = state.celebration;
  const moment = momentFor(celebration.type);
  const line = pickMascotLine(lines, state.mascot, moment, state.ageGroup, { random: () => 0 });

  let title = "Well done";
  let detail = "You stayed with the question until it was yours.";
  if (celebration.type === "section_complete") {
    title = `${celebration.section} is complete`;
    detail = "Every question in this section was learned, not skipped.";
  } else if (celebration.type === "level_up") {
    title = "The path goes a little deeper";
    detail = `Next we walk Cycle ${celebration.to.cycle}, ${TIER_LABELS[celebration.to.tier]}.`;
  } else if (celebration.type === "cycle_complete") {
    title = `Cycle ${celebration.cycle} is complete`;
    detail = `Cycle ${celebration.nextCycle} is ready when you are, at ${TIER_LABELS[celebration.tier]}.`;
  } else if (celebration.type === "caught_up") {
    title = "You have learned what we have here";
    detail = "More questions are on the way. Your path keeps the ground you have already gained.";
  }

  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-semibold text-grove-deep">{title}</h1>
      <p className="text-lg text-ink">{detail}</p>
      <div className="flex gap-3 rounded-3xl border border-line bg-card p-5">
        <MascotMark mascot={state.mascot} size="lg" />
        <div>
          <p className="text-base text-ink-soft">{MASCOTS[state.mascot].name}</p>
          <p className="text-lg text-ink">{line?.text}</p>
        </div>
      </div>
      {celebration.type === "caught_up" ? (
        <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to your path
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            saveState({ ...state, celebration: null });
            router.push("/play");
          }}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Continue
        </button>
      )}
    </section>
  );
}
