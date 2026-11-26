"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BadgeEmblem } from "@/components/BadgeEmblem";
import { FetchedPassage } from "@/components/FetchedPassage";
import { ShareBadgeButton } from "@/components/ShareBadgeButton";
import { useSignedIn } from "@/lib/account/use-access";
import { pathShelfBadges, type ShelfBadge } from "@/lib/game/badge-shelf";
import { planUnlock, readUnlockPlayed, unlockShelfClass, writeUnlockPlayed } from "@/lib/game/badge-unlock";
import { DAILY_BADGE_NAME } from "@/lib/game/daily-challenge";
import type { DailyBadgeRecord } from "@/lib/play/daily-streak";
import type { GameProgress, Question } from "@/lib/game/types";

export function BadgeShelf({
  progress,
  questions,
  dailyBadges = [],
  playerKey,
  celebrateIds,
  reducedMotion,
}: {
  progress: GameProgress;
  questions: Question[];
  dailyBadges?: DailyBadgeRecord[];
  /** When set, the shelf does not read the signed-in email. */
  playerKey?: string;
  /** When set, the shelf does not read or write the played list. Tests use this. */
  celebrateIds?: readonly string[];
  reducedMotion?: boolean;
}) {
  const auth = useSignedIn();
  const earned = pathShelfBadges(progress, questions);
  const daily: ShelfBadge[] = dailyBadges.map((badge) => ({
    id: `daily-${badge.day}`,
    name: DAILY_BADGE_NAME,
    art: "lamp",
    ref: badge.ref,
    kind: "daily",
  }));
  const entries = [...daily, ...earned];
  const entryKey = entries.map((entry) => entry.id).join("|");
  const [open, setOpen] = useState<ShelfBadge | null>(null);
  const [freshIds, setFreshIds] = useState<string[]>(celebrateIds ? [...celebrateIds] : []);
  const [motion, setMotion] = useState(reducedMotion ?? false);
  const resolvedKey = playerKey ?? (auth.ready ? (auth.email ?? "local") : null);

  useEffect(() => {
    if (reducedMotion !== undefined || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [reducedMotion]);

  useEffect(() => {
    if (celebrateIds) return;
    if (!resolvedKey || typeof window === "undefined") return;
    const earnedIds = entryKey.length > 0 ? entryKey.split("|") : [];
    const stored = readUnlockPlayed(window.localStorage, resolvedKey, "shelf");
    const plan = planUnlock(stored, earnedIds);
    writeUnlockPlayed(window.localStorage, resolvedKey, "shelf", plan.played);
    setFreshIds(plan.fresh);
  }, [celebrateIds, entryKey, resolvedKey]);

  const fresh = celebrateIds ?? freshIds;
  const reduce = reducedMotion ?? motion;

  return (
    <section className="grid min-w-0 gap-3" data-testid="badge-shelf">
      <h2 className="text-2xl font-semibold text-grove-deep">Badge shelf</h2>
      {entries.length === 0 ? (
        <p className="text-lg text-ink" data-testid="badge-shelf-empty">
          Badges you earn will sit here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {entries.map((entry) => {
            const motionClass = unlockShelfClass(fresh.includes(entry.id), reduce);
            return (
              <li key={entry.id} className="min-w-0">
                <button
                  type="button"
                  className="grid w-full min-w-0 justify-items-center gap-1 rounded-2xl px-1 py-2"
                  data-testid={`shelf-badge-${entry.id}`}
                  data-kind={entry.kind}
                  data-unlock={motionClass || undefined}
                  aria-label={`${entry.name}, earned`}
                  onClick={() => setOpen(entry)}
                >
                  <span className={`badge-shine mx-auto block w-full ${entry.kind === "daily" ? "max-w-[4.25rem]" : "max-w-[5.5rem]"} ${motionClass}`.trim()}>
                    <BadgeEmblem topic={entry.art} slug={entry.id} status="earned" />
                  </span>
                  <span className="max-w-full text-center text-sm leading-tight break-words text-ink">{entry.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open ? <BadgeVerseDialog badge={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function BadgeVerseDialog({ badge, onClose }: { badge: ShelfBadge; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="badge-earned-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="badge-verse"
        className="badge-verse-dialog"
      >
        <h2 id={titleId} className="text-2xl font-semibold text-grove-deep">
          {badge.name}
        </h2>
        <span className="badge-shine mx-auto block w-full max-w-[6.35rem]">
          <BadgeEmblem topic={badge.art} slug={badge.id} status="earned" />
        </span>
        <div className="min-w-0 text-left">
          <FetchedPassage reference={badge.ref} />
        </div>
        <ShareBadgeButton name={badge.name} topic={badge.art} slug={badge.id} />
        <button
          ref={closeRef}
          type="button"
          data-testid="badge-verse-close"
          onClick={onClose}
          className="min-h-12 rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
