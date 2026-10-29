"use client";

import Link from "next/link";
import { StageMap } from "@/components/StageMap";
import type { Question } from "@/lib/game/types";
import { useProfile } from "@/lib/use-profile";

export function PathClient({ questions }: { questions: Question[] }) {
  const { state, ready } = useProfile();
  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">Your stage map</h1>
        <p className="text-lg text-ink">Choose a mentor first. The map opens after placement.</p>
        <Link href="/profile" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Choose a mentor
        </Link>
      </section>
    );
  }
  return (
    <div className="grid gap-5">
      <StageMap questions={questions} progress={state.progress} />
      <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-4 text-lg text-ink">
        Back to your path
      </Link>
    </div>
  );
}
