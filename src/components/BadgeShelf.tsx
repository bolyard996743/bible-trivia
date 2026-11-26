"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BadgeEmblem } from "@/components/BadgeEmblem";
import { FetchedPassage } from "@/components/FetchedPassage";
import { ShareBadgeButton } from "@/components/ShareBadgeButton";
import { pathShelfBadges, type ShelfBadge } from "@/lib/game/badge-shelf";
import { DAILY_BADGE_NAME } from "@/lib/game/daily-challenge";
import type { DailyBadgeRecord } from "@/lib/play/daily-streak";
import type { GameProgress, Question } from "@/lib/game/types";

export function BadgeShelf({
  progress,
  questions,
  dailyBadges = [],
}: {
  progress: GameProgress;
  questions: Question[];
  dailyBadges?: DailyBadgeRecord[];
}) {
  const earned = pathShelfBadges(progress, questions);
  const daily: ShelfBadge[] = dailyBadges.map((badge) => ({
    id: `daily-${badge.day}`,
    name: DAILY_BADGE_NAME,
    art: "lamp",
    ref: badge.ref,
    kind: "daily",
  }));
  const entries = [...daily, ...earned];
  const [open, setOpen] = useState<ShelfBadge | null>(null);

  return (
    <section className="grid min-w-0 gap-3" data-testid="badge-shelf">
      <h2 className="text-2xl font-semibold text-grove-deep">Badge shelf</h2>
      {entries.length === 0 ? (
        <p className="text-lg text-ink" data-testid="badge-shelf-empty">
          Badges you earn will sit here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {entries.map((entry) => (
            <li key={entry.id} className="min-w-0">
              <button
                type="button"
                className="grid w-full min-w-0 justify-items-center gap-1 rounded-2xl px-1 py-2"
                data-testid={`shelf-badge-${entry.id}`}
                data-kind={entry.kind}
                aria-label={`${entry.name}, earned`}
                onClick={() => setOpen(entry)}
              >
                <span className={`badge-shine mx-auto block w-full ${entry.kind === "daily" ? "max-w-[4.25rem]" : "max-w-[5.5rem]"}`}>
                  <BadgeEmblem topic={entry.art} slug={entry.id} status="earned" />
                </span>
                <span className="max-w-full text-center text-sm leading-tight break-words text-ink">{entry.name}</span>
              </button>
            </li>
          ))}
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
        <ShareBadgeButton name={badge.name} />
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
