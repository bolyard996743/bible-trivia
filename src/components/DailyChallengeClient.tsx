"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gradeDailyChallengeAction, openDailyChallengeAction } from "@/app/daily/actions";
import { BadgeEmblem } from "@/components/BadgeEmblem";
import { FetchedPassage } from "@/components/FetchedPassage";
import { MascotMark } from "@/components/MascotMark";
import { PromptText } from "@/components/PromptText";
import { ShareBadgeButton } from "@/components/ShareBadgeButton";
import { StreakFlame } from "@/components/StreakFlame";
import { rememberPlayedDay } from "@/lib/account/daily-plays";
import { matchTypography } from "@/lib/game/typography";
import {
  DAILY_BADGE_NAME,
  DAILY_CORRECT_HEADING,
  DAILY_MISS_HEADING,
  DAILY_MISS_NOTE,
  finishDailyChallenge,
  type DailyAsk,
} from "@/lib/game/daily-challenge";
import { MASCOTS } from "@/lib/game/types";
import { playAnswerSound } from "@/lib/play/feedback-sound";
import { buzzAnswerHere } from "@/lib/play/haptics";
import { shouldWelcomeBack, visibleDailyStreak, WELCOME_BACK } from "@/lib/play/daily-streak";
import { acceptGuardedTap } from "@/lib/play/tap-guard";
import { todayKey } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function DailyMissPanel({ refs }: { refs: string[] }) {
  return (
    <div data-testid="daily-miss" className="grid min-w-0 gap-4 rounded-3xl border border-gold bg-card p-5">
      <h2 className="text-2xl font-semibold text-grove-deep">{DAILY_MISS_HEADING}</h2>
      <div className="grid min-w-0 gap-3">
        {refs.map((ref) => (
          <FetchedPassage key={ref} reference={ref} />
        ))}
      </div>
      <p className="text-lg text-ink">{DAILY_MISS_NOTE}</p>
    </div>
  );
}

export function DailyChallengeClient() {
  const router = useRouter();
  const { state, ready, save } = useProfile();
  const [ask, setAsk] = useState<DailyAsk | null>(null);
  const [opening, setOpening] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const submitted = useRef(false);
  const today = todayKey();

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete) router.replace("/placement");
  }, [ready, state, router]);

  useEffect(() => {
    if (!ready || !state?.placementComplete) return;
    if (state.dailyChallenge?.day === todayKey()) {
      setOpening(false);
      return;
    }
    let active = true;
    setOpening(true);
    void openDailyChallengeAction(state.progress, todayKey(), state.ageGroup)
      .then((result) => {
        if (!active) return;
        setAsk(result.status === "ready" ? result.ask : null);
        setProblem(result.status === "ready" ? null : "Today's question isn't ready yet. The path is still here.");
      })
      .catch(() => {
        if (active) setProblem("Today's question isn't ready yet. The path is still here.");
      })
      .finally(() => {
        if (active) setOpening(false);
      });
    return () => {
      active = false;
    };
  }, [ready, state]);

  if (!ready || !state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;

  const done = state.dailyChallenge?.day === today ? state.dailyChallenge : null;
  const streak = visibleDailyStreak(state.dailyPlay, today);

  async function choose(choiceId: string) {
    if (!state || !ask || busy) return;
    const decision = acceptGuardedTap({
      now: Date.now(),
      shownAt: shownAt.current,
      alreadySubmitted: submitted.current,
    });
    if (!decision.accepted) return;
    submitted.current = true;
    setBusy(true);
    const graded = await gradeDailyChallengeAction(state.progress, today, ask.id, choiceId);
    if (!graded) {
      submitted.current = false;
      setBusy(false);
      setProblem("Please try again in a little while.");
      return;
    }
    playAnswerSound(graded.correct ? "correct" : "miss", state.soundOn);
    buzzAnswerHere(graded.correct);
    const next = finishDailyChallenge(state, {
      day: today,
      questionId: ask.id,
      correct: graded.correct,
      refs: graded.refs,
    });
    save(next);
    if (state.ageGroup !== "child") void rememberPlayedDay(today);
    setAsk(null);
    setBusy(false);
  }

  return (
    <section className="grid min-w-0 gap-5" data-testid="daily-challenge">
      <div className="flex min-w-0 items-center gap-3">
        <MascotMark mascot={state.mascot} motion={done?.correct ? "celebrate" : "still"} />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-grove-deep">Daily question</h1>
          <p className="text-base text-ink-soft">{MASCOTS[state.mascot].name}</p>
          <StreakFlame count={streak} grow />
        </div>
      </div>
      {shouldWelcomeBack(state.dailyPlay, today) ? (
        <p data-testid="welcome-back" className="text-lg text-ink">
          {WELCOME_BACK}
        </p>
      ) : null}

      {done?.correct ? (
        <div data-testid="daily-correct" className="grid min-w-0 gap-4 rounded-3xl border border-grove bg-card p-5">
          <h2 className="text-2xl font-semibold text-grove-deep">{DAILY_CORRECT_HEADING}</h2>
          <div className="grid justify-items-center gap-2">
            <span className="badge-shine block w-full max-w-[4.25rem]">
              <BadgeEmblem topic="lamp" slug="daily-lamp" status="earned" />
            </span>
            <p className="text-lg text-ink">{DAILY_BADGE_NAME}</p>
          </div>
          <div className="grid min-w-0 gap-3">
            {done.refs.map((ref) => (
              <FetchedPassage key={ref} reference={ref} />
            ))}
          </div>
          <ShareBadgeButton name={DAILY_BADGE_NAME} topic="lamp" slug="daily-lamp" />
        </div>
      ) : null}

      {done && !done.correct ? <DailyMissPanel refs={done.refs} /> : null}

      {!done && opening ? <p className="text-lg text-ink-soft">Opening today’s question…</p> : null}

      {!done && ask ? (
        <div className="grid gap-4 rounded-3xl border border-line bg-card p-5" data-testid="daily-ask">
          <h2 data-testid="prompt" className="question-prompt text-2xl leading-snug font-semibold text-ink">
            <PromptText text={ask.prompt} />
          </h2>
          <div className="grid gap-3" role="group" aria-label="Answers">
            {ask.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                data-testid={`choice-${choice.id}`}
                disabled={busy}
                onClick={() => void choose(choice.id)}
                className="min-h-12 min-w-0 break-words rounded-2xl border border-line bg-parchment px-4 py-3 text-left text-lg text-ink enabled:hover:border-grove disabled:opacity-70"
              >
                {matchTypography(choice.text)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {problem ? <p className="text-lg text-ink">{problem}</p> : null}

      <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-4 text-lg text-ink">
        Back to your path
      </Link>
    </section>
  );
}
