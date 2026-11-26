"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgePageMark, type BadgeEmblemStatus } from "@/components/BadgeEmblem";
import { BadgeEarnedDialog } from "@/components/BadgeEarnedDialog";
import { BadgeRetryNotice } from "@/components/BadgeRetryNotice";
import { QuestionSession } from "@/components/QuestionSession";
import { attemptForQuestion, linesForPathPlay } from "@/lib/game";
import { showDifficultyLabels } from "@/lib/dev-flags";
import { badgeEarned, badgeJustEarned, badgeProgressLabel, selectBadgeQuestion } from "@/lib/game/badges";
import { BADGE_AHEAD_NOTE, BADGE_MISSING_NOTE } from "@/lib/game/badge-lock";
import { openBadgeRunAction, type BadgeRunResponse } from "@/app/play/open-badge";
import { citedSectionLabel } from "@/lib/game/section-label";
import {
  BADGE_EARNED_NOTE,
  BADGE_PREPARING_NOTE,
  badgeRetryDeadline,
  openAttemptCorrectIds,
  recordBadgeAnswer,
} from "@/lib/game/badge-retry";
import { attemptPoints, questionMarkers, recordClear, advanceStage, selectLadderQuestion } from "@/lib/game/ladder";
import { findPathBadge } from "@/lib/game/path";
import type { AttemptState, GameProgress, MascotLine, Question } from "@/lib/game/types";
import { rememberPlayedDay } from "@/lib/account/daily-plays";
import { awardQuestionPoints } from "@/lib/account/scoring";
import { useSignedIn } from "@/lib/account/use-access";
import { applyPlayedDay } from "@/lib/play/daily-streak";
import type { Celebration, StoredState } from "@/lib/storage";
import { saveState, todayKey } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function PlayClient({
  questions,
  lines,
  audioFiles,
  badgeId = null,
}: {
  questions: Question[];
  lines: MascotLine[];
  audioFiles: string[];
  /** Set by the server page. A badge link never falls through to the main path. */
  badgeId?: string | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const { state, ready, save } = useProfile();
  const auth = useSignedIn();
  const stateRef = useRef(state);
  stateRef.current = state;
  const shownRef = useRef<Question | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reviewingMiss, setReviewingMiss] = useState(false);
  const [earnedMoment, setEarnedMoment] = useState<{ id: string; name: string; art: string } | null>(null);
  const [run, setRun] = useState<BadgeRunResponse | null>(null);
  const continueHref = useRef<string | null>(null);
  const requestedBadge = badgeId ?? search.get("badge") ?? "";
  const badge = requestedBadge ? findPathBadge(requestedBadge) : null;
  const retryAt = state && badge ? badgeRetryDeadline(state.progress, badge.id) : null;
  const waiting = Boolean(retryAt && Date.parse(retryAt) > now);

  useEffect(() => {
    if (!ready) return;
    if (!state) router.replace("/profile");
    else if (!state.placementComplete) router.replace("/placement");
  }, [ready, state, router]);

  useEffect(() => {
    if (!requestedBadge || !state?.placementComplete) return;
    let active = true;
    void openBadgeRunAction(state.progress, requestedBadge)
      .then((result) => {
        if (active) setRun(result);
      })
      .catch(() => {
        if (active) setRun({ status: "missing", message: BADGE_MISSING_NOTE });
      });
    return () => {
      active = false;
    };
    // Load once for this badge. Later answers stay on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBadge, state?.placementComplete]);

  useEffect(() => {
    if (!waiting && !reviewingMiss) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [reviewingMiss, waiting]);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (!state?.placementComplete) return <p className="text-lg text-ink-soft">Opening…</p>;
  if (requestedBadge && !run) return <p className="text-lg text-ink-soft">Opening…</p>;

  if (requestedBadge && run?.status === "missing") {
    return (
      <section className="grid gap-4" data-testid="badge-missing">
        <h1 className="text-3xl font-semibold text-grove-deep">That badge is not on the path</h1>
        <p className="text-lg text-ink">{run.message}</p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to the map
        </Link>
      </section>
    );
  }

  if (requestedBadge && run?.status === "locked" && badge) {
    return (
      <section className="grid gap-4" data-testid="badge-locked">
        <BadgePageMark topic={badge.art} slug={badge.id} status="sealed" title={badge.name} />
        <p className="text-lg text-ink">{run.message || BADGE_AHEAD_NOTE}</p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to the map
        </Link>
      </section>
    );
  }

  const playQuestions = run?.status === "ready" ? run.questions : questions;
  const playLines = run?.status === "ready" ? run.lines : lines;

  if (badge && waiting && retryAt && !reviewingMiss && run?.status !== "locked") {
    return (
      <section className="grid gap-4" data-testid="badge-retry-screen">
        <BadgePageMark topic={badge.art} slug={badge.id} status="locked" title={badge.name} />
        <BadgeRetryNotice now={Date.now()} retryAt={retryAt} />
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          See your stage map
        </Link>
      </section>
    );
  }
  if (badge && badge.questionIds.length === 0) {
    return (
      <section className="grid gap-4" data-testid="badge-unwritten">
        <BadgePageMark topic={badge.art} slug={badge.id} status="empty" title={badge.name} />
        <p className="text-lg text-ink">This story is still being written. The badge stays empty until its questions are ready.</p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Back to the map
        </Link>
      </section>
    );
  }
  const focused = badge && run?.status === "ready" && !reviewingMiss ? selectBadgeQuestion(playQuestions, state.progress, badge, new Date(now)) : null;
  const pick = reviewingMiss && shownRef.current
    ? { question: shownRef.current, review: false }
    : badge
      ? focused
        ? { question: focused, review: false }
        : null
      : selectLadderQuestion(playQuestions, state.progress);
  if (!pick) {
    const earned = Boolean(badge && badgeEarned(state.progress, badge));
    const status: BadgeEmblemStatus = earned ? "earned" : "empty";
    return (
      <section className="grid gap-4">
        {badge ? (
          <BadgePageMark topic={badge.art} slug={badge.id} status={status} title={badge.name} />
        ) : (
          <h1 className="text-3xl font-semibold text-grove-deep">You are caught up</h1>
        )}
        <p className="text-lg text-ink" data-testid={badge ? "badge-closed" : undefined}>
          {badge
            ? badgeEarned(state.progress, badge)
              ? BADGE_EARNED_NOTE
              : BADGE_PREPARING_NOTE
            : "You have learned every question we have for this part of the path. More Scripture is on the way, and what you learned stays with you."}
        </p>
        <Link href="/path" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          See your stage map
        </Link>
        {earnedMoment ? (
          <BadgeEarnedDialog
            name={earnedMoment.name}
            topic={earnedMoment.art}
            slug={earnedMoment.id}
            mascot={state.mascot}
            onContinue={() => {
              setEarnedMoment(null);
              const href = continueHref.current;
              continueHref.current = null;
              if (href) router.push(href);
            }}
          />
        ) : null}
      </section>
    );
  }

  const { question, review } = pick;
  if (!reviewingMiss) shownRef.current = question;
  const markers = questionMarkers({
    review,
    tier: question.tier,
    showDifficulty: showDifficultyLabels(state.showDifficulty === true, search.toString()),
  });

  function notePlayed() {
    const current = stateRef.current;
    if (!current) return;
    const today = todayKey();
    const dailyPlay = applyPlayedDay(current.dailyPlay, today);
    if (dailyPlay === current.dailyPlay) return;
    const next = { ...current, dailyPlay };
    stateRef.current = next;
    save(next);
    if (current.ageGroup !== "child") void rememberPlayedDay(today);
  }

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
      lines={linesForPathPlay(playLines)}
      soundOn={state.soundOn}
      audioFiles={audioFiles}
      progressLabel={badge ? badgeProgressLabel(badge.id, citedSectionLabel(question)) : `${state.progress.stage ?? "Seed"} · ${citedSectionLabel(question)}`}
      reviewLabel={markers.review}
      difficultyLabel={badge ? null : markers.difficulty}
      initialAttempt={badge ? null : attemptForQuestion(question.id, state.progress)}
      onAttemptChange={badge ? undefined : rememberAttempt}
      closeOnMiss={Boolean(badge)}
      attemptCorrectIds={badge ? openAttemptCorrectIds(state.progress, badge.id) : null}
      onAnswered={notePlayed}
      missFooter={badge && reviewingMiss && retryAt ? <BadgeRetryNotice now={now} retryAt={retryAt} /> : null}
      onMiss={(missCount) => {
        const current = stateRef.current;
        if (!current || !badge) return;
        let progress: GameProgress = {
          ...current.progress,
          streak: 0,
          openAttempt: null,
          missCounts: { ...(current.progress.missCounts ?? {}), [question.id]: missCount },
        };
        progress = recordBadgeAnswer(progress, badge, question.id, false, new Date());
        save({ ...current, progress });
        setReviewingMiss(true);
      }}
      onContinue={({ firstAttemptCorrect, missCount }) => {
        if (badge && !firstAttemptCorrect) {
          setReviewingMiss(false);
          return;
        }
        const current = stateRef.current ?? state;
        const wasEarned = badge ? badgeEarned(current.progress, badge) : false;
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
        if (badge) progress = recordBadgeAnswer(progress, badge, question.id, firstAttemptCorrect, new Date());
        const earnedNow = Boolean(badge && badgeJustEarned(wasEarned, badgeEarned(progress, badge)));
        const before = progress.stage;
        progress = advanceStage(playQuestions, progress);
        const celebration: Celebration | null =
          progress.stage !== before
            ? { type: "level_up", from: { cycle: current.progress.cycle, tier: current.progress.tier }, to: { cycle: current.progress.cycle, tier: current.progress.tier } }
            : null;
        const next = { ...current, progress, celebration };
        stateRef.current = next;
        save(next);
        if (current.ageGroup !== "child" && auth.email && !review) {
          void awardQuestionPoints({ questionId: question.id, missCount, seasonId: progress.seasonId ?? "season-1" });
        }
        if (earnedNow && badge) {
          if (celebration) continueHref.current = "/complete";
          setEarnedMoment({ id: badge.id, name: badge.name, art: badge.art });
        } else if (celebration) {
          router.push("/complete");
        }
      }}
    />
  );
}
