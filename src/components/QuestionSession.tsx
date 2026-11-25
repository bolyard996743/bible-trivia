"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FetchedPassage } from "@/components/FetchedPassage";
import { MascotMark } from "@/components/MascotMark";
import { prefetchPassages } from "@/lib/bible/passage-client";
import {
  acknowledgeTeaching,
  orderChoicesForRetry,
  mascotLineAudioSrc,
  pickMascotLine,
  pickWording,
  resumeAttempt,
  shouldShowExtended,
  shouldShowTakeaway,
  submitAnswer,
  wasFirstAttempt,
} from "@/lib/game";
import { choicesForBadgeAsk } from "@/lib/game/badges";
import { matchTypography } from "@/lib/game/typography";
import { MASCOTS, type AgeGroup, type AttemptState, type MascotId, type MascotLine, type Question } from "@/lib/game/types";

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
  reviewLabel,
  difficultyLabel,
  initialAttempt,
  onAttemptChange,
  onContinue,
  closeOnMiss = false,
  onMiss,
  missFooter = null,
}: {
  question: Question;
  ageGroup: AgeGroup;
  mascot: MascotId;
  lines: MascotLine[];
  soundOn: boolean;
  audioFiles: string[];
  progressLabel?: string;
  reviewLabel?: string | null;
  difficultyLabel?: string | null;
  initialAttempt?: AttemptState | null;
  onAttemptChange?: (attempt: AttemptState) => void;
  onContinue: (result: MasteryResult) => void;
  /** A badge miss ends the attempt. The question is not asked again in this sitting. */
  closeOnMiss?: boolean;
  onMiss?: (missCount: number) => void;
  missFooter?: ReactNode;
}) {
  const [attempt, setAttempt] = useState(() => resumeAttempt(question.id, initialAttempt));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prompt = matchTypography(pickWording(question.prompt, ageGroup));
  const explanation = matchTypography(pickWording(question.teaching.explanation, ageGroup));
  const info = MASCOTS[mascot];

  const spoken = useMemo(() => {
    const line =
      attempt.phase === "teaching"
        ? pickMascotLine(lines, mascot, "wrong_intro", ageGroup, { questionId: question.id })
        : attempt.phase === "mastered"
          ? pickMascotLine(lines, mascot, shouldShowTakeaway(attempt) ? "correct_after_retry" : "correct", ageGroup, {
              questionId: question.id,
            })
          : null;
    if (!line) return null;
    return { ...line, text: matchTypography(line.text) };
  }, [ageGroup, attempt, lines, mascot, question.id]);

  const retryLine = useMemo(() => {
    if (closeOnMiss || attempt.phase !== "teaching") return null;
    const line = pickMascotLine(lines, mascot, "retry_prompt", ageGroup, { questionId: question.id });
    return line ? { ...line, text: matchTypography(line.text) } : null;
  }, [ageGroup, attempt.phase, closeOnMiss, lines, mascot, question.id]);

  const verseKey = question.teaching.verses.map((verse) => verse.ref).join("\n");
  useEffect(() => {
    prefetchPassages(verseKey.split("\n").filter((ref) => ref.length > 0));
  }, [verseKey]);

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

  function updateAttempt(next: AttemptState) {
    setAttempt(next);
    if (closeOnMiss && next.phase === "teaching" && attempt.phase === "asking") {
      onMiss?.(next.missCount);
      return;
    }
    onAttemptChange?.(next);
  }

  function choose(choiceId: string) {
    if (attempt.phase !== "asking") return;
    updateAttempt(submitAnswer(attempt, choiceId === question.answer));
  }

  const showExtended = !closeOnMiss && attempt.phase === "teaching" && shouldShowExtended(attempt.missCount);
  const showTakeaway = !closeOnMiss && shouldShowTakeaway(attempt);
  const displayedChoices = closeOnMiss
    ? choicesForBadgeAsk(question)
    : attempt.missCount === 0
      ? question.choices
      : orderChoicesForRetry(question.choices, `${question.id}:${attempt.missCount}`);

  return (
    <section data-testid="question-screen" className="grid gap-5">
      <div className="flex items-center gap-3">
        <MascotMark mascot={mascot} />
        <div>
          <p className="text-base text-ink-soft">{info.name}</p>
          {progressLabel ? <p className="text-base text-ink-soft">{progressLabel}</p> : null}
          {reviewLabel ? (
            <p data-testid="review-label" className="text-base font-semibold text-gold">
              {reviewLabel}
            </p>
          ) : null}
          {difficultyLabel ? (
            <p data-testid="difficulty-label" className="text-base text-ink-soft">
              {difficultyLabel}
            </p>
          ) : null}
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
                className="min-w-0 break-words rounded-2xl border border-line bg-parchment px-4 py-3 text-left text-lg text-ink enabled:hover:border-grove disabled:opacity-70"
              >
                {matchTypography(choice.text)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {attempt.phase === "teaching" && (spoken || closeOnMiss) ? (
        <div data-testid="teaching" className="grid gap-4 rounded-3xl border border-gold bg-card p-5">
          <h2 className="text-2xl font-semibold text-grove-deep">Let&apos;s look at this together</h2>
          <div className="flex min-w-0 gap-3">
            <MascotMark mascot={mascot} />
            {spoken ? (
              <p data-testid="mascot-line" className="min-w-0 text-lg text-ink [overflow-wrap:anywhere]">
                {spoken.text}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3">
            {question.teaching.verses.map((verse) => (
              <FetchedPassage key={verse.ref} reference={verse.ref} />
            ))}
          </div>
          <p data-testid="explanation" className="text-lg text-ink">
            {explanation}
          </p>
          {showExtended && question.teaching.extended_explanation ? (
            <div data-testid="extended-explanation" className="rounded-2xl border border-line px-4 py-3">
              <h3 className="text-lg font-semibold text-grove-deep">A little more help</h3>
              <p className="mt-1 text-lg text-ink">{matchTypography(question.teaching.extended_explanation)}</p>
            </div>
          ) : null}
          {retryLine ? <p className="text-lg text-ink-soft">{retryLine.text}</p> : null}
          {closeOnMiss ? missFooter : null}
          <button
            type="button"
            data-testid={closeOnMiss ? "badge-miss-continue" : "ready-button"}
            onClick={() => {
              if (closeOnMiss) {
                onContinue({
                  questionId: question.id,
                  firstAttemptCorrect: false,
                  missCount: attempt.missCount,
                });
                return;
              }
              updateAttempt(acknowledgeTeaching(attempt));
            }}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            {closeOnMiss ? "Continue" : "I'm ready"}
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
              {matchTypography(question.teaching.takeaway)}
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
