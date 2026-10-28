"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuestionSession } from "@/components/QuestionSession";
import { applyMastery, nextQuestion } from "@/lib/game";
import type { MascotLine, Question } from "@/lib/game/types";
import { saveState, type Celebration } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function PlayClient({
  questions,
  lines,
  audioFiles,
}: {
  questions: Question[];
  lines: MascotLine[];
  audioFiles: string[];
}) {
  const router = useRouter();
  const { state, ready } = useProfile();

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete) router.replace("/placement");
  }, [ready, state, router]);

  if (!ready || !state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const question = nextQuestion(questions, state.progress);
  if (!question) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">You are caught up</h1>
        <p className="text-lg text-ink">
          You have learned every question we have for this part of the path. More Scripture is on the way, and what you learned stays with you.
        </p>
        <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to your path
        </Link>
      </section>
    );
  }

  return (
    <QuestionSession
      key={question.id}
      question={question}
      ageGroup={state.ageGroup}
      mascot={state.mascot}
      lines={lines}
      soundOn={state.soundOn}
      audioFiles={audioFiles}
      progressLabel={`Cycle ${state.progress.cycle} · ${question.section}`}
      onContinue={({ firstAttemptCorrect }) => {
        const result = applyMastery(questions, state.progress, question.id, firstAttemptCorrect);
        const celebration: Celebration | null = result.event.type === "mastered" ? null : result.event;
        saveState({ ...state, progress: result.progress, celebration });
        if (celebration) router.push("/complete");
      }}
    />
  );
}
