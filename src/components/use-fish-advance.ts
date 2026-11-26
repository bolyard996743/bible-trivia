"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADVANCE_MS,
  consumeAdvance,
  pauseForReading,
  prefersReducedMotion,
  remainingMs,
  skipAdvance,
  startCorrectAdvance,
  tick,
  wakeDelay,
  type AdvanceClock,
} from "@/lib/play/advance-clock";

export function useFishAdvance(active: boolean, onAdvance: () => void) {
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  const pauseRef = useRef<() => void>(() => {});
  const skipRef = useRef<() => void>(() => {});
  const [view, setView] = useState(() => ({
    paused: false,
    reducedMotion: prefersReducedMotion(),
    secondsLeft: Math.ceil(ADVANCE_MS / 1000),
  }));

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let fired = false;
    const reducedMotion = prefersReducedMotion();
    let clock: AdvanceClock = startCorrectAdvance(performance.now(), reducedMotion);
    let timer = 0;

    const publish = (now: number) => {
      if (cancelled) return;
      setView({
        paused: !clock.running && !clock.advanced,
        reducedMotion,
        secondsLeft: Math.max(0, Math.ceil(remainingMs(clock, now) / 1000)),
      });
    };

    const finish = () => {
      if (cancelled || fired) return;
      const result = consumeAdvance(clock);
      clock = result.clock;
      if (!result.fire) return;
      fired = true;
      window.clearTimeout(timer);
      onAdvanceRef.current();
    };

    const arm = (now: number) => {
      window.clearTimeout(timer);
      if (cancelled || clock.advanced) return;
      timer = window.setTimeout(step, wakeDelay(clock, now, reducedMotion));
    };

    const step = () => {
      if (cancelled) return;
      const now = performance.now();
      clock = tick(clock, now);
      publish(now);
      if (clock.advanced) {
        finish();
        return;
      }
      arm(performance.now());
    };

    pauseRef.current = () => {
      if (cancelled || clock.advanced || clock.mode !== "correct") return;
      const now = performance.now();
      clock = pauseForReading(clock, now);
      publish(now);
      arm(now);
    };

    skipRef.current = () => {
      if (cancelled || fired) return;
      const now = performance.now();
      clock = skipAdvance(clock);
      publish(now);
      if (clock.advanced) finish();
    };

    publish(performance.now());
    arm(performance.now());

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      pauseRef.current = () => {};
      skipRef.current = () => {};
    };
  }, [active]);

  const pause = useCallback(() => pauseRef.current(), []);
  const skip = useCallback(() => skipRef.current(), []);

  return {
    paused: view.paused,
    reducedMotion: view.reducedMotion,
    secondsLeft: view.secondsLeft,
    pause,
    skip,
  };
}
