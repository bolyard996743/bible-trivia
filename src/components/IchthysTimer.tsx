"use client";

import { ADVANCE_MS, nextQuestionCountdown } from "@/lib/play/advance-clock";

/**
 * Classic ichthys. Two arcs meet at the head and cross again near the tail,
 * so the tail is the pair of lines past that crossing.
 */
const OUTLINE =
  "M6 38 C28 46 46 60 58 70 C100 128 180 136 248 70 C180 4 100 12 58 70 C46 80 28 94 6 102";
const BODY = "M58 70 C100 128 180 136 248 70 C180 4 100 12 58 70 Z";

const BODY_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="58 0 190 140"><path fill="white" d="${BODY}"/></svg>`,
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
      <div className="relative w-[7.5rem]" style={{ aspectRatio: "260 / 140" }}>
        {reducedMotion ? null : (
          <div
            className="absolute"
            style={{
              left: "22.308%",
              top: 0,
              width: "73.077%",
              height: "100%",
              WebkitMask: `${BODY_MASK} center / 100% 100% no-repeat`,
              mask: `${BODY_MASK} center / 100% 100% no-repeat`,
            }}
          >
            <div
              className={paused ? "ichthys-fill is-paused" : "ichthys-fill"}
              style={{ animationDuration: `${ADVANCE_MS}ms` }}
            />
          </div>
        )}
        <svg viewBox="0 0 260 140" className="ichthys absolute inset-0 h-full w-full overflow-visible text-grove-deep" role="img" aria-label={label}>
          <path d={OUTLINE} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
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
