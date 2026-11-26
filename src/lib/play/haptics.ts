import { STORAGE_KEY } from "../storage";

/** Device preference. Missing means on. This is not part of the player record. */
export const HAPTICS_KEY = `${STORAGE_KEY}:haptics`;

export type HapticsKind = "correct" | "badge";

export type Vibrator = {
  vibrate?: (pattern: number | number[]) => boolean;
};

const PATTERNS: Record<HapticsKind, number | number[]> = {
  correct: 15,
  badge: [15, 40, 20],
};

export function hapticsEnabled(storage: { getItem(key: string): string | null }): boolean {
  try {
    return storage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeHapticsEnabled(
  storage: { setItem(key: string, value: string): void },
  enabled: boolean,
): void {
  try {
    storage.setItem(HAPTICS_KEY, enabled ? "on" : "off");
  } catch {
    // A blocked browser keeps the in-memory switch and must not affect play.
  }
}

/**
 * A short buzz where Vibration API exists. Unsupported browsers, including
 * iOS Safari and most desktops, are skipped. A throw is ignored.
 */
export function buzz(kind: HapticsKind, enabled: boolean, nav: Vibrator | null | undefined): boolean {
  if (!enabled || !nav || typeof nav.vibrate !== "function") return false;
  try {
    return nav.vibrate(PATTERNS[kind]) !== false;
  } catch {
    return false;
  }
}

export function buzzForAnswer(
  correct: boolean,
  storage: { getItem(key: string): string | null },
  nav: Vibrator | null | undefined,
): boolean {
  if (!correct) return false;
  try {
    return buzz("correct", hapticsEnabled(storage), nav);
  } catch {
    return false;
  }
}

export function buzzForBadge(
  storage: { getItem(key: string): string | null },
  nav: Vibrator | null | undefined,
): boolean {
  try {
    return buzz("badge", hapticsEnabled(storage), nav);
  } catch {
    return false;
  }
}

export function buzzAnswerHere(correct: boolean): boolean {
  try {
    if (typeof window === "undefined") return false;
    return buzzForAnswer(correct, window.localStorage, window.navigator);
  } catch {
    return false;
  }
}

export function buzzBadgeHere(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return buzzForBadge(window.localStorage, window.navigator);
  } catch {
    return false;
  }
}
