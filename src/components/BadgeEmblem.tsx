import { useId, type CSSProperties, type ReactNode } from "react";
import { BADGE_GLYPHS } from "@/components/badge-glyphs";
import { badgeLook } from "@/lib/game/badge-look";
import type { BadgeAttention } from "@/lib/game/badge-seen";

export type BadgeEmblemStatus = "earned" | "empty" | "locked";

export function BadgeEmblem({
  topic,
  slug = "",
  status,
  attention = "none",
}: {
  topic: string;
  slug?: string;
  status: BadgeEmblemStatus;
  attention?: BadgeAttention;
}) {
  const rawId = useId().replace(/:/g, "");
  const attentionClass = attention === "flash" ? "badge-flash" : attention === "glow" ? "badge-glow" : "";
  if (status !== "earned") {
    return (
      <span
        className={`badge-emblem ${attentionClass}`.trim()}
        data-blank="true"
        data-attention={attention === "none" ? undefined : attention}
      >
        <span className="badge-blank" aria-hidden="true" />
        {status === "locked" ? (
          <span className="badge-chip badge-chip-clock" data-chip="clock" role="img" aria-label="Locked for 24 hours">
            <ClockIcon />
          </span>
        ) : null}
      </span>
    );
  }

  const look = badgeLook(topic, slug);
  const Glyph = BADGE_GLYPHS[look.icon];
  const style = {
    "--badge-ring-from": look.palette.ringFrom,
    "--badge-ring-to": look.palette.ringTo,
    "--badge-inner": look.palette.inner,
    "--badge-ink": look.palette.ink,
    "--badge-wash": look.palette.wash,
    "--badge-accent": look.palette.accent,
  } as CSSProperties;

  return (
    <span
      className={`badge-emblem ${attentionClass}`.trim()}
      style={style}
      data-icon={look.icon}
      data-attention={attention === "none" ? undefined : attention}
    >
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
    </span>
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
