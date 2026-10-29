"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STARTING_REASSURANCE } from "@/lib/copy";
import type { MascotLine, Question } from "@/lib/game/types";
import { fetchAroundScore, fetchSignedInBoards, fetchTopBoard, type PublicBoardRow } from "@/lib/account/leaderboard";
import { pointsFromProgress } from "@/lib/account/points";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import { useProfile } from "@/lib/use-profile";

function BoardList({ rows }: { rows: PublicBoardRow[] }) {
  if (rows.length === 0) {
    return <p className="text-lg text-ink-soft">No scores yet. The board fills as players master questions.</p>;
  }
  return (
    <ol className="grid gap-2">
      {rows.map((row) => (
        <li key={`${row.rank ?? "s"}-${row.username}`} className="flex items-center justify-between rounded-2xl border border-line bg-parchment px-4 py-3 text-lg">
          <span>
            {row.rank ? <span className="mr-3 text-ink-soft">{row.rank}</span> : null}
            {row.username}
          </span>
          <span>{row.points} pts</span>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardClient({ questions }: { questions: Question[]; lines: MascotLine[] }) {
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const auth = useSignedIn();
  const [rows, setRows] = useState<PublicBoardRow[]>([]);
  const [near, setNear] = useState<PublicBoardRow[]>([]);
  const points = pointsFromProgress(questions, state?.progress.masteredIds ?? []);
  const under13 = gate.value?.under13 || state?.ageGroup === "child";
  const localBoard = !auth.email || under13;

  useEffect(() => {
    if (!gate.ready || !auth.ready || !localBoard) return;
    let active = true;
    void Promise.all([fetchTopBoard(), fetchAroundScore(points)]).then(([top, around]) => {
      if (!active) return;
      setRows(top);
      setNear(around);
    });
    return () => {
      active = false;
    };
  }, [gate.ready, auth.ready, localBoard, points]);

  useEffect(() => {
    if (!gate.ready || !auth.ready || localBoard) return;
    let active = true;
    void fetchSignedInBoards().then((next) => {
      if (!active) return;
      setRows(next.top);
      setNear(next.near);
    });
    return () => {
      active = false;
    };
  }, [gate.ready, auth.ready, localBoard]);

  if (!ready || !gate.ready || !auth.ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-semibold text-grove-deep">Leaderboards</h1>
      <p className="text-lg text-ink">{STARTING_REASSURANCE}</p>
      <p className="text-base text-ink-soft">
        Points come from questions you have mastered: 1 for foundation, 2 for intermediate, 3 for advanced, and 4 for expert.
      </p>
      {localBoard ? (
        <>
          <div className="grid gap-3" data-testid="top-board">
            <h2 className="text-2xl font-semibold text-grove-deep">Top 15</h2>
            <BoardList rows={rows} />
          </div>
          <div className="grid gap-3" data-testid="near-you-board">
            <h2 className="text-2xl font-semibold text-grove-deep">Near your score</h2>
            <BoardList rows={near} />
          </div>
          <p className="text-lg text-ink" data-testid="device-points">
            You: {points} points (just on this device)
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-3" data-testid="top-board">
            <h2 className="text-2xl font-semibold text-grove-deep">Top 15</h2>
            <BoardList rows={rows} />
          </div>
          <div className="grid gap-3" data-testid="near-you-board">
            <h2 className="text-2xl font-semibold text-grove-deep">Near you</h2>
            <p className="text-base text-ink-soft">Ten players above you, you, and four below.</p>
            <BoardList rows={near} />
          </div>
        </>
      )}
      <Link href={state?.placementComplete ? "/home" : "/"} className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Back
      </Link>
    </section>
  );
}
