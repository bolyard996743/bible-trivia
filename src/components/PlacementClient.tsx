"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionSession } from "@/components/QuestionSession";
import { MascotMark } from "@/components/MascotMark";
import { pickMascotLine, scorePlacement, selectPlacementQuestions } from "@/lib/game";
import { questionMarkers, recordClear } from "@/lib/game/ladder";
import type { GameProgress, MascotLine, PlacementAttempt, Question } from "@/lib/game/types";
import { MASCOTS } from "@/lib/game/types";
import { emptyProgress } from "@/lib/game/progression";
import { savePlayerState } from "@/lib/account/repository";
import { useProfile } from "@/lib/use-profile";

export function PlacementClient({
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
  const quiz = useMemo(() => selectPlacementQuestions(questions), [questions]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<PlacementAttempt[]>([]);
  const [missCounts, setMissCounts] = useState<Record<string, number>>({});
  const finishing = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (state.placementComplete && !finishing.current) router.replace("/home");
  }, [ready, state, router]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state || (state.placementComplete && !finishing.current)) {
    return <p className="text-lg text-ink-soft">Opening…</p>;
  }

  const intro = pickMascotLine(lines, state.mascot, "placement_intro", state.ageGroup, { random: () => 0 });
  const question = quiz[index];

  if (!started || !question) {
    return (
      <section className="grid gap-5">
        <h1 className="text-3xl font-semibold text-grove-deep">A short placement</h1>
        <div className="flex gap-3 rounded-3xl border border-line bg-card p-5">
          <MascotMark mascot={state.mascot} size="lg" />
          <div>
            <p className="text-base text-ink-soft">{MASCOTS[state.mascot].name}</p>
            <p className="text-lg text-ink">{intro?.text}</p>
          </div>
        </div>
        <p className="text-lg text-ink">
          {quiz.length} questions help us find a starting place. This is not something you can fail. If you miss one, we learn it together before moving on. Only your first try shapes where you begin.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          I&apos;m ready to begin
        </button>
      </section>
    );
  }

  const markers = questionMarkers({
    review: false,
    tier: question.tier,
    showDifficulty: state.showDifficulty === true,
  });

  return (
    <QuestionSession
      key={question.id}
      question={question}
      ageGroup={state.ageGroup}
      mascot={state.mascot}
      lines={lines}
      soundOn={state.soundOn}
      audioFiles={audioFiles}
      progressLabel={`Placement ${index + 1} of ${quiz.length}`}
      difficultyLabel={markers.difficulty}
      onContinue={({ firstAttemptCorrect, missCount }) => {
        const nextAttempts = [
          ...attempts,
          { questionId: question.id, tier: question.tier, firstAttemptCorrect },
        ];
        const nextMisses = { ...missCounts, [question.id]: missCount };
        if (index + 1 < quiz.length) {
          setAttempts(nextAttempts);
          setMissCounts(nextMisses);
          setIndex(index + 1);
          return;
        }
        const result = scorePlacement(nextAttempts);
        finishing.current = true;
        const placementIds = nextAttempts.map((attempt) => attempt.questionId);
        let progress: GameProgress = {
          ...emptyProgress(result.cycle, result.tier),
          stage: result.stage,
          missCounts: nextMisses,
          masteredIds: placementIds,
          placementIds,
        };
        for (const attempt of nextAttempts) {
          if (!attempt.firstAttemptCorrect) continue;
          const answered = quiz.find((item) => item.id === attempt.questionId);
          if (answered) progress = recordClear(progress, answered, true);
        }
        savePlayerState({
          ...state,
          placementComplete: true,
          placement: {
            cycle: result.cycle,
            tier: result.tier,
            earned: result.earned,
            possible: result.possible,
            stage: result.stage,
          },
          progress,
          celebration: null,
        });
        router.push("/results");
      }}
    />
  );
}
