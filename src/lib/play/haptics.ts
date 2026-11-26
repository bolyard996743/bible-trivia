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
  return storage.getItem(HAPTICS_KEY) !== "off";
}

export function writeHapticsEnabled(
  storage: { setItem(key: string, value: string): void },
  enabled: boolean,
): void {
  storage.setItem(HAPTICS_KEY, enabled ? "on" : "off");
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
  return buzz("correct", hapticsEnabled(storage), nav);
}

export function buzzForBadge(
  storage: { getItem(key: string): string | null },
  nav: Vibrator | null | undefined,
): boolean {
  return buzz("badge", hapticsEnabled(storage), nav);
}

export function buzzAnswerHere(correct: boolean): boolean {
  if (typeof window === "undefined") return false;
  return buzzForAnswer(correct, window.localStorage, window.navigator);
}

export function buzzBadgeHere(): boolean {
  if (typeof window === "undefined") return false;
  return buzzForBadge(window.localStorage, window.navigator);
}
