"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MascotMark } from "@/components/MascotMark";
import {
  acknowledgeTeaching,
  orderChoicesForRetry,
  mascotLineAudioSrc,
  pickMascotLine,
  pickWording,
  shouldShowExtended,
  shouldShowTakeaway,
  startAttempt,
  submitAnswer,
  wasFirstAttempt,
} from "@/lib/game";
import { MASCOTS, type AgeGroup, type MascotId, type MascotLine, type Question } from "@/lib/game/types";

type MasteryResult = {
  questionId: string;
  firstAttemptCorrect: boolean;
  missCount: number;
};

export function QuestionSession({
  question,
  ageGroup,
  mascot,
  lines,
  soundOn,
  audioFiles,
  progressLabel,
  onContinue,
}: {
  question: Question;
  ageGroup: AgeGroup;
  mascot: MascotId;
  lines: MascotLine[];
  soundOn: boolean;
  audioFiles: string[];
  progressLabel?: string;
  onContinue: (result: MasteryResult) => void;
}) {
  const [attempt, setAttempt] = useState(() => startAttempt(question.id));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prompt = pickWording(question.prompt, ageGroup);
  const explanation = pickWording(question.teaching.explanation, ageGroup);
  const info = MASCOTS[mascot];

  const spoken = useMemo(() => {
    if (attempt.phase === "teaching") {
      return pickMascotLine(lines, mascot, "wrong_intro", ageGroup, { questionId: question.id });
    }
    if (attempt.phase === "mastered") {
      const moment = shouldShowTakeaway(attempt) ? "correct_after_retry" : "correct";
      return pickMascotLine(lines, mascot, moment, ageGroup, { questionId: question.id });
    }
    return null;
  }, [ageGroup, attempt, lines, mascot, question.id]);

  const retryLine = useMemo(() => {
    if (attempt.phase !== "teaching") return null;
    return pickMascotLine(lines, mascot, "retry_prompt", ageGroup, { questionId: question.id });
  }, [ageGroup, attempt.phase, lines, mascot, question.id]);

  useEffect(() => {
    if (!soundOn) {
      audioRef.current?.pause();
      return;
    }
    if (!spoken) return;
    const src = mascotLineAudioSrc(mascot, spoken);
    if (!audioFiles.includes(src)) return;
    audioRef.current?.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
    };
  }, [audioFiles, mascot, soundOn, spoken]);

  function choose(choiceId: string) {
    if (attempt.phase !== "asking") return;
    setAttempt(submitAnswer(attempt, choiceId === question.answer));
  }

  const showExtended = attempt.phase === "teaching" && shouldShowExtended(attempt.missCount);
  const showTakeaway = shouldShowTakeaway(attempt);
  const displayedChoices =
    attempt.missCount === 0
      ? question.choices
      : orderChoicesForRetry(question.choices, `${question.id}:${attempt.missCount}`);

  return (
    <section data-testid="question-screen" className="grid gap-5">
      <div className="flex items-center gap-3">
        <MascotMark mascot={mascot} />
        <div>
          <p className="text-base text-ink-soft">{info.name}</p>
          {progressLabel ? <p className="text-base text-ink-soft">{progressLabel}</p> : null}
        </div>
      </div>

      {attempt.phase === "asking" ? (
        <div className="grid gap-4 rounded-3xl border border-line bg-card p-5">
          <h1 data-testid="prompt" className="text-2xl leading-snug font-semibold text-ink sm:text-3xl">
            {prompt}
          </h1>
          <div className="grid gap-3" role="group" aria-label="Answers">
            {displayedChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                data-testid={`choice-${choice.id}`}
                disabled={attempt.phase !== "asking"}
                onClick={() => choose(choice.id)}
                className="rounded-2xl border border-line bg-parchment px-4 py-3 text-left text-lg text-ink enabled:hover:border-grove disabled:opacity-70"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {attempt.phase === "teaching" && spoken ? (
        <div data-testid="teaching" className="grid gap-4 rounded-3xl border border-gold bg-card p-5">
          <h2 className="text-2xl font-semibold text-grove-deep">Let&apos;s look at this together</h2>
          <div className="flex gap-3">
            <MascotMark mascot={mascot} />
            <p data-testid="mascot-line" className="text-lg text-ink">
              {spoken.text}
            </p>
          </div>
          <div className="grid gap-3">
            {question.teaching.verses.map((verse) => (
              <figure key={verse.ref} data-testid="verse" className="rounded-2xl bg-gold-soft px-4 py-3">
                <blockquote className="text-lg text-ink">{verse.text}</blockquote>
                <figcaption className="mt-2 text-base text-ink-soft">
                  {verse.ref} · {verse.translation}
                </figcaption>
              </figure>
            ))}
          </div>
          <p data-testid="explanation" className="text-lg text-ink">
            {explanation}
          </p>
          {showExtended && question.teaching.extended_explanation ? (
            <div data-testid="extended-explanation" className="rounded-2xl border border-line px-4 py-3">
              <h3 className="text-lg font-semibold text-grove-deep">A little more help</h3>
              <p className="mt-1 text-lg text-ink">{question.teaching.extended_explanation}</p>
            </div>
          ) : null}
          {retryLine ? <p className="text-lg text-ink-soft">{retryLine.text}</p> : null}
          <button
            type="button"
            data-testid="ready-button"
            onClick={() => setAttempt(acknowledgeTeaching(attempt))}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            I&apos;m ready
          </button>
        </div>
      ) : null}

      {attempt.phase === "mastered" ? (
        <div data-testid="correct-panel" className="grid gap-4 rounded-3xl border border-grove bg-card p-5">
          <div className="flex gap-3">
            <MascotMark mascot={mascot} />
            <div>
              <h2 className="text-2xl font-semibold text-grove-deep">
                {wasFirstAttempt(attempt) ? "That's right" : "Yes — now you've got it"}
              </h2>
              {spoken ? (
                <p data-testid="mascot-line" className="mt-2 text-lg text-ink">
                  {spoken.text}
                </p>
              ) : null}
            </div>
          </div>
          {showTakeaway ? (
            <p data-testid="takeaway" className="text-lg font-semibold text-ink">
              {question.teaching.takeaway}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="continue-button"
            onClick={() =>
              onContinue({
                questionId: question.id,
                firstAttemptCorrect: wasFirstAttempt(attempt),
                missCount: attempt.missCount,
              })
            }
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            Continue
          </button>
        </div>
      ) : null}
    </section>
  );
}
