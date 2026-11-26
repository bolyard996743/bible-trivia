import { STORAGE_KEY } from "../storage";

/** Display-only count of correct answers in a row. It is not part of scoring. */
export const COMBO_KEY = `${STORAGE_KEY}:combo`;

export const COMBO_MAX = 6;

export function comboLevel(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(COMBO_MAX, Math.floor(count));
}

/** A correct answer steps the glow up. A miss clears it, with nothing else to show. */
export function applyCombo(current: number, correct: boolean): number {
  if (!correct) return 0;
  return comboLevel(current) + 1 > COMBO_MAX ? COMBO_MAX : comboLevel(current) + 1;
}

export function readCombo(storage: { getItem(key: string): string | null }): number {
  const raw = storage.getItem(COMBO_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return comboLevel(value);
}

export function writeCombo(storage: { setItem(key: string, value: string): void }, count: number): number {
  const next = comboLevel(count);
  storage.setItem(COMBO_KEY, String(next));
  return next;
}
