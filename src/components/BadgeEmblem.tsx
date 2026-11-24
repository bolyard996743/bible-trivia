import { useId, type CSSProperties, type ReactNode } from "react";
import { BADGE_GLYPHS } from "@/components/badge-glyphs";
import { badgeLook } from "@/lib/game/badge-look";

export type BadgeEmblemStatus = "earned" | "empty" | "locked";

const CHIP_LABEL = {
  earned: "Earned",
  empty: "Not earned yet",
  locked: "Locked for 24 hours",
} as const;

export function BadgeEmblem({
  topic,
  slug = "",
  status,
}: {
  topic: string;
  slug?: string;
  status: BadgeEmblemStatus;
}) {
  const rawId = useId().replace(/:/g, "");
  const look = badgeLook(topic, slug);
  const Glyph = BADGE_GLYPHS[look.icon];
  const muted = status !== "earned";
  const chip = status === "earned" ? "check" : status === "locked" ? "clock" : "lock";
  const style = {
    "--badge-ring-from": look.palette.ringFrom,
    "--badge-ring-to": look.palette.ringTo,
    "--badge-inner": look.palette.inner,
    "--badge-ink": look.palette.ink,
    "--badge-wash": look.palette.wash,
    "--badge-accent": look.palette.accent,
  } as CSSProperties;

  return (
    <span className={`badge-emblem${muted ? " badge-emblem-muted" : ""}`} style={style} data-icon={look.icon}>
      <svg className="badge-art" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id={`${rawId}-ring`} x1="16" y1="6" x2="104" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={look.palette.ringFrom} />
            <stop offset="0.55" stopColor={look.palette.accent} />
            <stop offset="1" stopColor={look.palette.ringTo} />
          </linearGradient>
          <radialGradient id={`${rawId}-face`} cx="42%" cy="36%" r="68%">
            <stop offset="0" stopColor="#fffdf8" />
            <stop offset="0.72" stopColor={look.palette.inner} />
            <stop offset="1" stopColor={look.palette.wash} />
          </radialGradient>
        </defs>
        <circle cx="60" cy="56" r="52" fill={`url(#${rawId}-ring)`} />
        <circle cx="60" cy="56" r="40" fill={`url(#${rawId}-face)`} />
        <circle cx="60" cy="56" r="40" fill="none" stroke="#fffdf8" strokeOpacity="0.65" strokeWidth="1.5" />
        <g transform="translate(25 21) scale(1.08)">
          <Glyph />
        </g>
      </svg>
      <span className={`badge-chip badge-chip-${chip}`} data-chip={chip} role="img" aria-label={CHIP_LABEL[status]}>
        {chip === "check" ? <CheckIcon /> : chip === "clock" ? <ClockIcon /> : <LockIcon />}
      </span>
    </span>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="badge-chip-icon">
      <path d="M3.2 8.2 6.4 11.2 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="badge-chip-icon">
      <rect x="3.2" y="7" width="9.6" height="6.4" rx="1.4" fill="currentColor" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="badge-chip-icon">
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 4.7V8.1l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BadgePageMark({
  topic,
  slug,
  status,
  title,
  children,
}: {
  topic: string;
  slug: string;
  status: BadgeEmblemStatus;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <BadgeEmblem topic={topic} slug={slug} status={status} />
      <h1 className="text-3xl font-semibold text-grove-deep">{title}</h1>
      {children}
    </div>
  );
}
