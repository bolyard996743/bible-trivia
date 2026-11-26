"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BadgeEmblem, type BadgeEmblemStatus } from "@/components/BadgeEmblem";
import { FetchedPassage } from "@/components/FetchedPassage";
import { ShareBadgeButton } from "@/components/ShareBadgeButton";
import { badgeStatusLabel, stageSlug } from "@/lib/game/badges";
import { BADGE_EARNED_NOTE, BADGE_RETRY_CARE, BADGE_RETRY_WAIT } from "@/lib/game/badge-retry";
import {
  SHELF_NOT_EARNED,
  SHELF_PLAY,
  shelfCountLabel,
  shelfPlayHref,
  type ShelfSlot,
  type ShelfStageGroup,
} from "@/lib/game/badge-shelf";
import { DAILY_BADGE_NAME } from "@/lib/game/daily-challenge";
import type { DailyBadgeRecord } from "@/lib/play/daily-streak";

type VerseBadge = {
  id: string;
  name: string;
  art: string;
  ref: string;
};

type ShelfOpen =
  | { kind: "verse"; badge: VerseBadge }
  | { kind: "unearned"; slot: ShelfSlot };

export function BadgeShelf({
  stages,
  dailyBadges = [],
}: {
  stages: ShelfStageGroup[];
  dailyBadges?: DailyBadgeRecord[];
}) {
  const daily: VerseBadge[] = dailyBadges.map((badge) => ({
    id: `daily-${badge.day}`,
    name: DAILY_BADGE_NAME,
    art: "lamp",
    ref: badge.ref,
  }));
  const [open, setOpen] = useState<ShelfOpen | null>(null);
  const hasSlots = stages.some((stage) => stage.slots.length > 0) || daily.length > 0;

  return (
    <section className="grid min-w-0 gap-4" data-testid="badge-shelf">
      <h2 className="text-2xl font-semibold text-grove-deep">Badge shelf</h2>
      {hasSlots ? null : (
        <p className="text-lg text-ink" data-testid="badge-shelf-empty">
          Badges you earn will sit here.
        </p>
      )}
      {daily.length > 0 ? (
        <ul className="shelf-grid grid gap-x-2 gap-y-4" aria-label="Daily badges">
          {daily.map((badge) => (
            <li key={badge.id} className="min-w-0">
              <ShelfButton
                id={badge.id}
                name={badge.name}
                art={badge.art}
                status="earned"
                kind="daily"
                onOpen={() => setOpen({ kind: "verse", badge })}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {stages.map((stage) => (
        <section key={stage.stage} className="shelf-stage grid min-w-0 gap-3" data-testid={`shelf-stage-${stageSlug(stage.stage)}`}>
          <h3>
            <span>{stage.stage}</span>
            <span className="text-base font-semibold whitespace-nowrap text-ink-soft" data-testid={`shelf-count-${stageSlug(stage.stage)}`}>
              {shelfCountLabel(stage.earned, stage.total)}
            </span>
          </h3>
          <ul className="shelf-grid grid gap-x-2 gap-y-4" aria-label={`${stage.stage} badges`}>
            {stage.slots.map((slot) => (
              <li key={slot.id} className="min-w-0">
                <ShelfButton
                  id={slot.id}
                  name={slot.name}
                  art={slot.art}
                  status={slot.status}
                  kind="path"
                  onOpen={() => setOpen(openForSlot(slot))}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {open?.kind === "verse" ? <BadgeVerseDialog badge={open.badge} onClose={() => setOpen(null)} /> : null}
      {open?.kind === "unearned" ? <UnearnedDialog slot={open.slot} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

/** Earned badges may open a verse. Everything else drops the verse before the dialog is built. */
function openForSlot(slot: ShelfSlot): ShelfOpen {
  if (slot.status === "earned" && slot.ref) {
    return { kind: "verse", badge: { id: slot.id, name: slot.name, art: slot.art, ref: slot.ref } };
  }
  if (slot.status === "earned") {
    return { kind: "verse", badge: { id: slot.id, name: slot.name, art: slot.art, ref: "" } };
  }
  return {
    kind: "unearned",
    slot: { id: slot.id, name: slot.name, art: slot.art, status: slot.status },
  };
}

function emblemStatus(status: ShelfSlot["status"]): BadgeEmblemStatus {
  if (status === "earned") return "earned";
  if (status === "locked") return "locked";
  return "empty";
}

function ShelfButton({
  id,
  name,
  art,
  status,
  kind,
  onOpen,
}: {
  id: string;
  name: string;
  art: string;
  status: ShelfSlot["status"];
  kind: "path" | "daily";
  onOpen: () => void;
}) {
  const earned = status === "earned";
  const labelStatus = status === "locked" ? "locked" : earned ? "earned" : "empty";
  return (
    <button
      type="button"
      className="grid w-full min-w-0 justify-items-center gap-1 rounded-2xl px-0.5 py-1"
      data-testid={`shelf-badge-${id}`}
      data-kind={kind}
      data-state={status}
      aria-label={badgeStatusLabel(name, labelStatus)}
      onClick={onOpen}
    >
      <span
        className={`mx-auto block w-full ${kind === "daily" ? "max-w-[4.25rem]" : "max-w-[5.5rem]"} ${earned ? "badge-shine" : "shelf-unearned"}`}
      >
        <BadgeEmblem topic={art} slug={id} status={emblemStatus(status)} />
      </span>
      <span className={`badge-caption ${earned ? "text-grove-deep" : "text-ink"}`}>{name}</span>
    </button>
  );
}

function useDialogDismiss(onClose: () => void) {
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
  return closeRef;
}

function BadgeVerseDialog({ badge, onClose }: { badge: VerseBadge; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useDialogDismiss(onClose);
  return (
    <div className="badge-earned-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="badge-verse" className="badge-verse-dialog">
        <h2 id={titleId} className="text-2xl font-semibold text-grove-deep">
          {badge.name}
        </h2>
        <span className="badge-shine mx-auto block w-full max-w-[6.35rem]">
          <BadgeEmblem topic={badge.art} slug={badge.id} status="earned" />
        </span>
        {badge.ref ? (
          <div className="min-w-0 text-left">
            <FetchedPassage reference={badge.ref} />
          </div>
        ) : (
          <p className="text-lg text-ink">{BADGE_EARNED_NOTE}</p>
        )}
        <ShareBadgeButton name={badge.name} topic={badge.art} slug={badge.id} />
        <button
          ref={closeRef}
          type="button"
          data-testid="badge-verse-close"
          onClick={onClose}
          className="min-h-12 w-full rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function UnearnedDialog({ slot, onClose }: { slot: ShelfSlot; onClose: () => void }) {
  const titleId = useId();
  const noteId = useId();
  const closeRef = useDialogDismiss(onClose);
  const locked = slot.status === "locked";
  const href = shelfPlayHref(slot);
  return (
    <div className="badge-earned-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        data-testid={locked ? "shelf-locked" : "shelf-unearned"}
        className="badge-verse-dialog shelf-note"
      >
        <h2 id={titleId} className="text-2xl font-semibold text-grove-deep">
          {slot.name}
        </h2>
        <span className="shelf-unearned mx-auto block w-full max-w-[6.35rem]">
          <BadgeEmblem topic={slot.art} slug={slot.id} status={locked ? "locked" : "empty"} />
        </span>
        <div id={noteId} className="grid min-w-0 gap-2">
          {href ? (
            <p className="text-lg break-words text-ink" data-testid="shelf-unearned-note">
              {SHELF_NOT_EARNED}{" "}
              <Link href={href} data-testid="shelf-play-link" className="tap text-grove-deep underline">
                {SHELF_PLAY}
              </Link>
            </p>
          ) : (
            <div data-testid="shelf-locked-note" className="grid gap-2">
              <p className="text-lg break-words text-ink">
                {SHELF_NOT_EARNED} {BADGE_RETRY_WAIT}
              </p>
              <p className="text-lg break-words text-ink">{BADGE_RETRY_CARE}</p>
            </div>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          data-testid="shelf-note-close"
          onClick={onClose}
          className="min-h-12 w-full rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
