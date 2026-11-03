"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionSession } from "@/components/QuestionSession";
import { attemptForQuestion } from "@/lib/game";
import { showDifficultyLabels } from "@/lib/dev-flags";
import { selectBadgeQuestion } from "@/lib/game/badges";
import { attemptPoints, questionMarkers, recordClear, advanceStage, selectLadderQuestion } from "@/lib/game/ladder";
import { findPathBadge } from "@/lib/game/path";
import type { AttemptState, MascotLine, Question } from "@/lib/game/types";
import { awardQuestionPoints } from "@/lib/account/scoring";
import { savePlayerState } from "@/lib/account/repository";
import { useSignedIn } from "@/lib/account/use-access";
import type { Celebration, StoredState } from "@/lib/storage";
import { saveState } from "@/lib/storage";
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
  const search = useSearchParams();
  const { state, ready } = useProfile();
  const auth = useSignedIn();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete) router.replace("/placement");
  }, [ready, state, router]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const badge = findPathBadge(search.get("badge") ?? "");
  if (badge && badge.questionIds.length === 0) {
    return (
      <section className="grid gap-4" data-testid="badge-unwritten">
        <h1 className="text-3xl font-semibold text-grove-deep">{badge.name}</h1>
        <p className="text-lg text-ink">This story is still being written. The badge stays empty until its questions are ready.</p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to the map
        </Link>
      </section>
    );
  }
  const focused = badge ? selectBadgeQuestion(questions, state.progress, badge) : null;
  const pick = badge ? (focused ? { question: focused, review: false } : null) : selectLadderQuestion(questions, state.progress);
  if (!pick) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">{badge ? badge.name : "You are caught up"}</h1>
        <p className="text-lg text-ink">
          {badge
            ? "You have already seen the questions for this badge. It fills when they were right on the first try."
            : "You have learned every question we have for this part of the path. More Scripture is on the way, and what you learned stays with you."}
        </p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          See your stage map
        </Link>
      </section>
    );
  }

  const { question, review } = pick;
  const markers = questionMarkers({
    review,
    tier: question.tier,
    showDifficulty: showDifficultyLabels(state.showDifficulty === true, search.toString()),
  });

  function rememberAttempt(attempt: AttemptState) {
    const current = stateRef.current;
    if (!current) return;
    const next: StoredState = {
      ...current,
      progress: {
        ...current.progress,
        openAttempt: attempt,
        missCounts: { ...(current.progress.missCounts ?? {}), [attempt.questionId]: attempt.missCount },
      },
    };
    stateRef.current = next;
    saveState(next);
  }

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
      reviewLabel={markers.review}
      difficultyLabel={markers.difficulty}
      initialAttempt={attemptForQuestion(question.id, state.progress)}
      onAttemptChange={rememberAttempt}
      onContinue={({ firstAttemptCorrect, missCount }) => {
        const current = stateRef.current ?? state;
        const scored = new Set(current.progress.scoredIds ?? []);
        const gained = attemptPoints(missCount, review, scored.has(question.id));
        if (gained > 0) scored.add(question.id);
        const mastered = new Set(current.progress.masteredIds);
        let streak = current.progress.streak;
        let seasonMasteredCount = current.progress.seasonMasteredCount;
        if (!review && !mastered.has(question.id)) {
          mastered.add(question.id);
          streak = firstAttemptCorrect ? streak + 1 : 0;
          seasonMasteredCount += 1;
        }
        let progress = recordClear(
          {
            ...current.progress,
            masteredIds: [...mastered],
            streak,
            bestStreak: Math.max(current.progress.bestStreak, streak),
            seasonMasteredCount,
            scoredIds: [...scored],
            points: (current.progress.points ?? 0) + gained,
            draw: (current.progress.draw ?? 0) + 1,
            openAttempt: null,
            missCounts: { ...(current.progress.missCounts ?? {}), [question.id]: missCount },
          },
          question,
          firstAttemptCorrect && !review,
        );
        const before = progress.stage;
        progress = advanceStage(questions, progress);
        const celebration: Celebration | null =
          progress.stage !== before
            ? { type: "level_up", from: { cycle: current.progress.cycle, tier: current.progress.tier }, to: { cycle: current.progress.cycle, tier: current.progress.tier } }
            : null;
        const next = { ...current, progress, celebration };
        stateRef.current = next;
        savePlayerState(next);
        if (current.ageGroup !== "child" && auth.email && !review) {
          void awardQuestionPoints({ questionId: question.id, missCount, seasonId: progress.seasonId ?? "season-1" });
        }
        if (celebration) router.push("/complete");
      }}
    />
  );
}
