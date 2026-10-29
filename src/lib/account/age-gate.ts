import type { AgeGroup } from "../game/types";
import type { StoredState } from "../storage";

export const AGE_GATE_KEY = "bible-trivia-age-gate-v1";
export const DEVICE_BIRTH_KEY = "bible-trivia-birth-v1";
export const ACCOUNT_PROMPT_DISMISSED_KEY = "bible-trivia-account-prompt-dismissed";

/**
 * Audience brackets the mascot lines already use.
 * Child is under 13, teen is 13–17, adult is 18–64, and older is 65 and over.
 * Age is completed years. The birthday itself counts as the new age.
 */
export const AGE_BRACKETS = ["child", "teen", "adult", "older"] as const;

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

/** Audience stored on the device. The birth date lives in a separate key. */
export type AgeGate = {
  version: 1;
  bracket: AgeGroup;
  under13: boolean;
};

/** Birth date kept on this device. It is not included in leaderboard requests. */
export type DeviceBirth = CalendarDate & {
  recordedUnder13: boolean;
};

export function isValidCalendarDate(date: CalendarDate): boolean {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) return false;
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return false;
  const probe = new Date(date.year, date.month - 1, date.day);
  return probe.getFullYear() === date.year && probe.getMonth() === date.month - 1 && probe.getDate() === date.day;
}

export function calendarToday(now = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Completed years from birth to today. A birthday today is included. */
export function ageInYears(birth: CalendarDate, today: CalendarDate): number {
  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1;
  return age;
}

export function ageGroupFromBirthDate(birth: CalendarDate, today: CalendarDate = calendarToday()): AgeGroup {
  const age = ageInYears(birth, today);
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 65) return "adult";
  return "older";
}

export function ageGateFromBracket(bracket: AgeGroup): AgeGate {
  return { version: 1, bracket, under13: bracket === "child" };
}

export function ageGateFromBirthDate(birth: CalendarDate, today?: CalendarDate): AgeGate {
  return ageGateFromBracket(ageGroupFromBirthDate(birth, today));
}

export function ageGateFromAgeGroup(age: AgeGroup): AgeGate {
  return ageGateFromBracket(age);
}

export function birthDateIso(date: CalendarDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export function parseAgeGate(raw: string | null): AgeGate | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AgeGate> & { year?: unknown; month?: unknown; day?: unknown; birthDate?: unknown };
    if (value.version !== 1) return null;
    if (value.bracket !== "child" && value.bracket !== "teen" && value.bracket !== "adult" && value.bracket !== "older") {
      return null;
    }
    if (typeof value.under13 !== "boolean") return null;
    if (value.under13 !== (value.bracket === "child")) return null;
    if ("year" in value || "month" in value || "day" in value || "birthDate" in value || "birth_date" in value) return null;
    return { version: 1, bracket: value.bracket, under13: value.under13 };
  } catch {
    return null;
  }
}

export function loadAgeGate(): AgeGate | null {
  if (typeof window === "undefined") return null;
  return parseAgeGate(window.localStorage.getItem(AGE_GATE_KEY));
}

export function writeAgeGate(gate: AgeGate): void {
  if (typeof window === "undefined") return;
  const stored: AgeGate = { version: 1, bracket: gate.bracket, under13: gate.under13 };
  const next = JSON.stringify(stored);
  if (window.localStorage.getItem(AGE_GATE_KEY) === next) return;
  window.localStorage.setItem(AGE_GATE_KEY, next);
  window.dispatchEvent?.(new Event("bible-trivia-age-gate"));
}

/**
 * Keeps the first under-13 answer. A later visit cannot replace it
 * unless the stored birth date itself now falls in an older bracket.
 */
export function saveAgeGate(gate: AgeGate): void {
  if (typeof window === "undefined") return;
  const existing = loadAgeGate();
  const birth = loadDeviceBirthDate();
  if (existing?.under13) {
    const stillChild = !birth || ageGroupFromBirthDate(birth) === "child";
    if (stillChild) return;
  }
  writeAgeGate(gate);
}

export function parseDeviceBirth(raw: string | null): DeviceBirth | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DeviceBirth>;
    if (!value || typeof value !== "object") return null;
    const date = { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
    if (!isValidCalendarDate(date) || typeof value.recordedUnder13 !== "boolean") return null;
    return { ...date, recordedUnder13: value.recordedUnder13 };
  } catch {
    return null;
  }
}

export function loadDeviceBirthDate(): DeviceBirth | null {
  if (typeof window === "undefined") return null;
  return parseDeviceBirth(window.localStorage.getItem(DEVICE_BIRTH_KEY));
}

/** The first saved birthday stays. Later tries do not replace it. */
export function saveDeviceBirthDate(date: CalendarDate, today: CalendarDate = calendarToday()): void {
  if (typeof window === "undefined") return;
  if (loadDeviceBirthDate()) return;
  const record: DeviceBirth = {
    year: date.year,
    month: date.month,
    day: date.day,
    recordedUnder13: ageGroupFromBirthDate(date, today) === "child",
  };
  window.localStorage.setItem(DEVICE_BIRTH_KEY, JSON.stringify(record));
}

export function loadAccountPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ACCOUNT_PROMPT_DISMISSED_KEY) === "1";
}

export function dismissAccountPrompt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_PROMPT_DISMISSED_KEY, "1");
}

/** Shown once when a birthday that was under 13 now computes to 13 or older. */
export function shouldOfferAccountPrompt(input: {
  birth: DeviceBirth | null;
  today: CalendarDate;
  dismissed: boolean;
  signedIn: boolean;
}): boolean {
  if (!input.birth || input.dismissed || input.signedIn || !input.birth.recordedUnder13) return false;
  if (!isValidCalendarDate(input.birth)) return false;
  return ageInYears(input.birth, input.today) >= 13;
}

/** Audience derived from a stored birthday, leaving progress and the mentor in place. */
export function stateWithBirthAge(state: StoredState, birth: CalendarDate, today: CalendarDate): StoredState {
  const ageGroup = ageGroupFromBirthDate(birth, today);
  if (state.ageGroup === ageGroup) return state;
  return { ...state, ageGroup };
}
