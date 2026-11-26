"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FetchedPassage } from "@/components/FetchedPassage";
import { IchthysTimer } from "@/components/IchthysTimer";
import { MascotMark } from "@/components/MascotMark";
import { PromptText } from "@/components/PromptText";
import { StreakFlame } from "@/components/StreakFlame";
import { useFishAdvance } from "@/components/use-fish-advance";
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
import { schedulesAutoAdvance } from "@/lib/play/advance-clock";
import { playAnswerSound } from "@/lib/play/feedback-sound";
import { rememberMissedVersesHere } from "@/lib/play/missed-verses";
import { badgeStreakDisplay } from "@/lib/play/streak";
import { acceptGuardedTap, TAP_GUARD_MS } from "@/lib/play/tap-guard";
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
  attemptCorrectIds = null,
  onAnswered,
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
  /** Correct ids in the open badge attempt. Null keeps the streak flame off the main path. */
  attemptCorrectIds?: readonly string[] | null;
  /** Called once when an answer is accepted, including a miss. */
  onAnswered?: () => void;
}) {
  const [attempt, setAttempt] = useState(() => resumeAttempt(question.id, initialAttempt));
  const [submitted, setSubmitted] = useState(false);
  const [guardTick, setGuardTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const submittedRef = useRef(false);
  const shownAtRef = useRef(Date.now());
  const missSubmittedRef = useRef(false);
  const missShownAtRef = useRef(0);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const outcomeRef = useRef<MasteryResult>({
    questionId: question.id,
    firstAttemptCorrect: false,
    missCount: 0,
  });
  const advancedRef = useRef(false);
  const guardKey = `${question.id}:${attempt.phase}:${attempt.missCount}`;
  const guardKeyRef = useRef(guardKey);
  if (guardKeyRef.current !== guardKey) {
    guardKeyRef.current = guardKey;
    if (attempt.phase === "asking") {
      shownAtRef.current = Date.now();
      submittedRef.current = false;
      if (submitted) setSubmitted(false);
    }
    if (attempt.phase === "teaching") {
      missShownAtRef.current = Date.now();
      missSubmittedRef.current = false;
    }
  }

  const prompt = pickWording(question.prompt, ageGroup);
  const explanation = matchTypography(pickWording(question.teaching.explanation, ageGroup));
  const info = MASCOTS[mascot];
  const autoAdvance = schedulesAutoAdvance(attempt.phase);
  const answerGuarded =
    attempt.phase === "asking" && guardTick >= 0 && Date.now() - shownAtRef.current < TAP_GUARD_MS;
  const missGuarded =
    attempt.phase === "teaching" && guardTick >= 0 && Date.now() - missShownAtRef.current < TAP_GUARD_MS;
  const streak =
    attemptCorrectIds == null
      ? 0
      : badgeStreakDisplay({
          correctIds: attemptCorrectIds,
          questionId: question.id,
          phase: attempt.phase,
        });

  outcomeRef.current = {
    questionId: question.id,
    firstAttemptCorrect: wasFirstAttempt(attempt),
    missCount: attempt.missCount,
  };

  const fish = useFishAdvance(autoAdvance, () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onContinue(outcomeRef.current);
  });
  const pauseAdvance = fish.pause;
  const skipAdvanceWait = fish.skip;

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
    if (attempt.phase !== "teaching") return;
    rememberMissedVersesHere(verseKey.split("\n"));
  }, [attempt.phase, verseKey]);

  useEffect(() => {
    const id = window.setTimeout(() => setGuardTick((tick) => tick + 1), TAP_GUARD_MS);
    return () => window.clearTimeout(id);
  }, [guardKey]);

  useEffect(() => {
    if (!autoAdvance) return;
    const onSelect = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) return;
      const node = selection.anchorNode;
      if (node && revealRef.current?.contains(node)) pauseAdvance();
    };
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, [autoAdvance, pauseAdvance]);

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
    const decision = acceptGuardedTap({
      now: Date.now(),
      shownAt: shownAtRef.current,
      alreadySubmitted: submittedRef.current,
    });
    if (!decision.accepted) return;
    submittedRef.current = true;
    setSubmitted(true);
    const correct = choiceId === question.answer;
    playAnswerSound(correct ? "correct" : "miss", soundOn);
    updateAttempt(submitAnswer(attempt, correct));
    onAnswered?.();
  }

  function continueAfterMiss() {
    const decision = acceptGuardedTap({
      now: Date.now(),
      shownAt: missShownAtRef.current,
      alreadySubmitted: missSubmittedRef.current,
    });
    if (!decision.accepted) return;
    missSubmittedRef.current = true;
    if (closeOnMiss) {
      onContinue({
        questionId: question.id,
        firstAttemptCorrect: false,
        missCount: attempt.missCount,
      });
      return;
    }
    updateAttempt(acknowledgeTeaching(attempt));
  }

  function continueAfterCorrect() {
    if (advancedRef.current) return;
    skipAdvanceWait();
  }

  function pauseForVerse(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    if (target.closest("[data-testid='verse']")) pauseAdvance();
  }

  const showExtended = !closeOnMiss && attempt.phase === "teaching" && shouldShowExtended(attempt.missCount);
  const showTakeaway = !closeOnMiss && shouldShowTakeaway(attempt);
  const displayedChoices = closeOnMiss
    ? choicesForBadgeAsk(question)
    : attempt.missCount === 0
      ? question.choices
      : orderChoicesForRetry(question.choices, `${question.id}:${attempt.missCount}`);

  return (
    <section data-testid="question-screen" data-auto-advance={autoAdvance ? "true" : "false"} className="grid gap-5">
      <div className="flex items-center gap-3">
        <MascotMark mascot={mascot} motion={autoAdvance ? "correct" : "still"} />
        <div className="min-w-0">
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
          <StreakFlame count={streak} />
        </div>
      </div>

      {attempt.phase === "asking" ? (
        <div className="grid gap-4 rounded-3xl border border-line bg-card p-5">
          <h1 data-testid="prompt" className="question-prompt text-2xl leading-snug font-semibold text-ink sm:text-3xl">
            <PromptText text={prompt} />
          </h1>
          <div className="grid gap-3" role="group" aria-label="Answers">
            {displayedChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                data-testid={`choice-${choice.id}`}
                disabled={submitted}
                onClick={() => choose(choice.id)}
                className={`min-w-0 break-words rounded-2xl border border-line bg-parchment px-4 py-3 text-left text-lg text-ink enabled:hover:border-grove disabled:opacity-70 ${
                  answerGuarded && !submitted ? "tap-guard" : ""
                }`}
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
          <div className="grid gap-3">
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
          </div>
          <button
            type="button"
            data-testid={closeOnMiss ? "badge-miss-continue" : "ready-button"}
            onClick={continueAfterMiss}
            className={`shrink-0 rounded-2xl bg-grove px-4 text-lg font-semibold text-white ${missGuarded ? "tap-guard" : ""}`}
          >
            {closeOnMiss ? "Continue" : "I'm ready"}
          </button>
        </div>
      ) : null}

      {autoAdvance ? (
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
          <div
            ref={revealRef}
            data-testid="reveal-area"
            className="grid gap-3"
            onScroll={pauseAdvance}
            onWheel={pauseAdvance}
            onTouchMove={pauseAdvance}
            onPointerDown={(event) => pauseForVerse(event.target)}
          >
            {question.teaching.verses.map((verse) => (
              <FetchedPassage key={verse.ref} reference={verse.ref} />
            ))}
          </div>
          <IchthysTimer paused={fish.paused} reducedMotion={fish.reducedMotion} secondsLeft={fish.secondsLeft} />
          <button
            type="button"
            data-testid="continue-button"
            onClick={continueAfterCorrect}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            Continue
          </button>
        </div>
      ) : null}
    </section>
  );
}
