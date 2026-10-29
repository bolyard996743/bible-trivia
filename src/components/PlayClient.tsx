"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuestionSession } from "@/components/QuestionSession";
import { attemptPoints, recordClear, advanceStage, selectLadderQuestion } from "@/lib/game/ladder";
import type { MascotLine, Question } from "@/lib/game/types";
import { awardQuestionPoints } from "@/lib/account/scoring";
import { savePlayerState } from "@/lib/account/repository";
import { useSignedIn } from "@/lib/account/use-access";
import type { Celebration } from "@/lib/storage";
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
  const auth = useSignedIn();

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete) router.replace("/placement");
  }, [ready, state, router]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const pick = selectLadderQuestion(questions, state.progress);
  if (!pick) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">You are caught up</h1>
        <p className="text-lg text-ink">
          You have learned every question we have for this part of the path. More Scripture is on the way, and what you learned stays with you.
        </p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          See your stage map
        </Link>
      </section>
    );
  }

  const { question, review } = pick;
  return (
    <QuestionSession
      key={`${question.id}:${state.progress.draw ?? 0}`}
      question={question}
      ageGroup={state.ageGroup}
      mascot={state.mascot}
      lines={lines}
      soundOn={state.soundOn}
      audioFiles={audioFiles}
      progressLabel={`${state.progress.stage ?? "Seed"} · ${question.section}`}
      onContinue={({ firstAttemptCorrect, missCount }) => {
        const scored = new Set(state.progress.scoredIds ?? []);
        const gained = attemptPoints(missCount, review, scored.has(question.id));
        if (gained > 0) scored.add(question.id);
        const mastered = new Set(state.progress.masteredIds);
        let streak = state.progress.streak;
        let seasonMasteredCount = state.progress.seasonMasteredCount;
        if (!review && !mastered.has(question.id)) {
          mastered.add(question.id);
          streak = firstAttemptCorrect ? streak + 1 : 0;
          seasonMasteredCount += 1;
        }
        let progress = recordClear(
          {
            ...state.progress,
            masteredIds: [...mastered],
            streak,
            bestStreak: Math.max(state.progress.bestStreak, streak),
            seasonMasteredCount,
            scoredIds: [...scored],
            points: (state.progress.points ?? 0) + gained,
            draw: (state.progress.draw ?? 0) + 1,
            missCounts: { ...(state.progress.missCounts ?? {}), [question.id]: missCount },
          },
          question,
          firstAttemptCorrect && !review,
        );
        const before = progress.stage;
        progress = advanceStage(questions, progress);
        const celebration: Celebration | null =
          progress.stage !== before
            ? { type: "level_up", from: { cycle: state.progress.cycle, tier: state.progress.tier }, to: { cycle: state.progress.cycle, tier: state.progress.tier } }
            : null;
        savePlayerState({ ...state, progress, celebration });
        if (state.ageGroup !== "child" && auth.email && !review) {
          void awardQuestionPoints({ questionId: question.id, missCount, seasonId: progress.seasonId ?? "season-1" });
        }
        if (celebration) router.push("/complete");
      }}
    />
  );
}
