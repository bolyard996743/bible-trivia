import type { AttemptPhase } from "@/lib/game/types";

/** How long a correct answer waits before the next question. */
export const ADVANCE_MS = 15_000;

/** Quiet time after the player reads, then the fish continues from where it paused. */
export const PAUSE_RESUME_MS = 3_000;

export type AdvanceMode = "correct" | "miss";

export type AdvanceClock = {
  mode: AdvanceMode;
  elapsedMs: number;
  running: boolean;
  segmentStartedAt: number | null;
  resumeAt: number | null;
  advanced: boolean;
  consumed: boolean;
  reducedMotion: boolean;
};

/** The fish and the automatic advance belong only to a correct answer. */
export function schedulesAutoAdvance(phase: AttemptPhase): boolean {
  return phase === "mastered";
}

/** Reduced motion keeps the same wait. It does not move on sooner. */
export function advanceDuration(reducedMotion: boolean): number {
  return reducedMotion ? ADVANCE_MS : ADVANCE_MS;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function nextQuestionCountdown(secondsLeft: number): string {
  const seconds = Math.max(0, Math.ceil(secondsLeft));
  return seconds === 1 ? "Next question in 1 second" : `Next question in ${seconds} seconds`;
}

export function startCorrectAdvance(now: number, reducedMotion: boolean): AdvanceClock {
  return {
    mode: "correct",
    elapsedMs: 0,
    running: true,
    segmentStartedAt: now,
    resumeAt: null,
    advanced: false,
    consumed: false,
    reducedMotion,
  };
}

/** A miss holds the verse. Nothing in this clock moves the player on. */
export function missHold(): AdvanceClock {
  return {
    mode: "miss",
    elapsedMs: 0,
    running: false,
    segmentStartedAt: null,
    resumeAt: null,
    advanced: false,
    consumed: false,
    reducedMotion: false,
  };
}

export function elapsedAt(clock: AdvanceClock, now: number): number {
  if (clock.mode !== "correct") return 0;
  if (!clock.running || clock.segmentStartedAt == null) return clock.elapsedMs;
  return clock.elapsedMs + Math.max(0, now - clock.segmentStartedAt);
}

export function remainingMs(clock: AdvanceClock, now: number): number {
  if (clock.mode !== "correct") return 0;
  return Math.max(0, ADVANCE_MS - elapsedAt(clock, now));
}

export function fillRatio(clock: AdvanceClock, now: number): number {
  if (clock.mode !== "correct") return 0;
  return Math.min(1, elapsedAt(clock, now) / ADVANCE_MS);
}

/**
 * Resume continues the elapsed time already saved.
 * Time spent paused is not counted, and the fill does not jump ahead.
 */
export function tick(clock: AdvanceClock, now: number): AdvanceClock {
  if (clock.mode !== "correct" || clock.advanced || clock.consumed) return clock;
  let next = clock;
  if (!next.running && next.resumeAt != null && now >= next.resumeAt) {
    next = {
      ...next,
      running: true,
      segmentStartedAt: next.resumeAt,
      resumeAt: null,
    };
  }
  if (!next.running) return next;
  const elapsed = elapsedAt(next, now);
  if (elapsed >= ADVANCE_MS) {
    return {
      ...next,
      elapsedMs: ADVANCE_MS,
      running: false,
      segmentStartedAt: null,
      resumeAt: null,
      advanced: true,
    };
  }
  return next;
}

/** Freeze the fish while the player reads, and start the quiet wait over. */
export function pauseForReading(clock: AdvanceClock, now: number): AdvanceClock {
  if (clock.mode !== "correct" || clock.advanced || clock.consumed) return clock;
  return {
    ...clock,
    elapsedMs: Math.min(ADVANCE_MS, elapsedAt(clock, now)),
    running: false,
    segmentStartedAt: null,
    resumeAt: now + PAUSE_RESUME_MS,
  };
}

/** Continue skips the rest of the wait. A miss cannot be skipped into an advance. */
export function skipAdvance(clock: AdvanceClock): AdvanceClock {
  if (clock.mode !== "correct" || clock.advanced || clock.consumed) return clock;
  return {
    ...clock,
    elapsedMs: ADVANCE_MS,
    running: false,
    segmentStartedAt: null,
    resumeAt: null,
    advanced: true,
  };
}

/** One shot. A second call, an unmount, or a miss does not advance again. */
export function consumeAdvance(clock: AdvanceClock): { clock: AdvanceClock; fire: boolean } {
  if (clock.mode !== "correct" || !clock.advanced || clock.consumed) return { clock, fire: false };
  return { clock: { ...clock, consumed: true }, fire: true };
}

/** When the clock should next be looked at. Paused clocks wake at the resume time. */
export function wakeDelay(clock: AdvanceClock, now: number, reducedMotion: boolean): number {
  if (clock.mode !== "correct" || clock.advanced) return 0;
  if (!clock.running && clock.resumeAt != null) return Math.max(0, clock.resumeAt - now);
  const left = Math.max(0, ADVANCE_MS - elapsedAt(clock, now));
  if (reducedMotion) return Math.min(1000, left);
  return left;
}
