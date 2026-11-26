"use client";

import { ADVANCE_MS, nextQuestionCountdown } from "@/lib/play/advance-clock";

/** Classic ichthys: two arcs meeting at the tail and the head. */
const ICHTHYS = "M18 44 C18 44 78 8 186 44 C78 80 18 44 18 44 Z";

const FISH_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 88"><path fill="white" d="${ICHTHYS}"/></svg>`,
)}")`;

export function IchthysTimer({
  paused,
  reducedMotion,
  secondsLeft,
}: {
  paused: boolean;
  reducedMotion: boolean;
  secondsLeft: number;
}) {
  const label = reducedMotion ? nextQuestionCountdown(secondsLeft) : "A fish filling until the next question";
  return (
    <div
      data-testid="ichthys-timer"
      data-paused={paused ? "true" : "false"}
      data-reduced={reducedMotion ? "true" : "false"}
      className="grid justify-items-center gap-2"
    >
      <div className="relative h-16 w-full max-w-48">
        {reducedMotion ? null : (
          <div
            className="absolute inset-0"
            style={{
              WebkitMask: `${FISH_MASK} center / contain no-repeat`,
              mask: `${FISH_MASK} center / contain no-repeat`,
            }}
          >
            <div
              className={paused ? "ichthys-fill is-paused" : "ichthys-fill"}
              style={{ animationDuration: `${ADVANCE_MS}ms` }}
            />
          </div>
        )}
        <svg viewBox="0 0 200 88" className="ichthys absolute inset-0 h-full w-full text-grove-deep" role="img" aria-label={label}>
          <path d={ICHTHYS} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
      {reducedMotion ? (
        <p data-testid="advance-countdown" className="text-base text-ink-soft">
          {nextQuestionCountdown(secondsLeft)}
        </p>
      ) : null}
    </div>
  );
}
