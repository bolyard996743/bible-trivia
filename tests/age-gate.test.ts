import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_PROMPT_DISMISSED_KEY,
  AGE_GATE_KEY,
  DEVICE_BIRTH_KEY,
  ageGroupFromBirthDate,
  ageInYears,
  dismissAccountPrompt,
  loadAgeGate,
  loadDeviceBirthDate,
  parseAgeGate,
  saveAgeGate,
  saveDeviceBirthDate,
  shouldOfferAccountPrompt,
  ageGateFromBirthDate,
} from "@/lib/account/age-gate";

const today = { year: 2026, month: 10, day: 29 };

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("age from a birthday", () => {
  it("counts the birthday and the day before at 13, 18, and 65", () => {
    expect(ageInYears({ year: 2013, month: 10, day: 29 }, today)).toBe(13);
    expect(ageGroupFromBirthDate({ year: 2013, month: 10, day: 29 }, today)).toBe("teen");
    expect(ageInYears({ year: 2013, month: 10, day: 30 }, today)).toBe(12);
    expect(ageGroupFromBirthDate({ year: 2013, month: 10, day: 30 }, today)).toBe("child");

    expect(ageInYears({ year: 2008, month: 10, day: 29 }, today)).toBe(18);
    expect(ageGroupFromBirthDate({ year: 2008, month: 10, day: 29 }, today)).toBe("adult");
    expect(ageGroupFromBirthDate({ year: 2008, month: 10, day: 30 }, today)).toBe("teen");

    expect(ageInYears({ year: 1961, month: 10, day: 29 }, today)).toBe(65);
    expect(ageGroupFromBirthDate({ year: 1961, month: 10, day: 29 }, today)).toBe("older");
    expect(ageGroupFromBirthDate({ year: 1961, month: 10, day: 30 }, today)).toBe("adult");
  });

  it("waits until March 1 for a February 29 birthday in a non-leap year", () => {
    const birth = { year: 2012, month: 2, day: 29 };
    expect(ageInYears(birth, { year: 2025, month: 2, day: 28 })).toBe(12);
    expect(ageInYears(birth, { year: 2025, month: 3, day: 1 })).toBe(13);
  });
});

describe("device birthday", () => {
  it("keeps the first answer and leaves the birth date out of the age gate", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
    const child = { year: 2018, month: 1, day: 1 };
    saveDeviceBirthDate(child, today);
    saveAgeGate(ageGateFromBirthDate(child, today));
    saveDeviceBirthDate({ year: 1990, month: 1, day: 1 }, today);
    saveAgeGate(ageGateFromBirthDate({ year: 1990, month: 1, day: 1 }, today));

    expect(loadDeviceBirthDate()).toMatchObject({ ...child, recordedUnder13: true });
    expect(loadAgeGate()).toEqual({ version: 1, bracket: "child", under13: true });
    const gate = window.localStorage.getItem(AGE_GATE_KEY) ?? "";
    expect(gate).not.toContain("2018");
    expect(parseAgeGate(JSON.stringify({ version: 1, bracket: "child", under13: true, birthDate: "2018-01-01" }))).toBeNull();
  });

  it("asks once when a stored child birthday reaches 13, and Not now sticks", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const birth = { year: 2013, month: 10, day: 29, recordedUnder13: true as const };
    const ask = (day: number, dismissed = false, signedIn = false) =>
      shouldOfferAccountPrompt({
        birth,
        today: { year: 2026, month: 10, day },
        dismissed,
        signedIn,
      });
    expect(ask(28)).toBe(false);
    expect(ask(29)).toBe(true);
    expect(ask(29, false, true)).toBe(false);
    expect(shouldOfferAccountPrompt({ birth: { ...birth, recordedUnder13: false }, today, dismissed: false, signedIn: false })).toBe(false);

    dismissAccountPrompt();
    expect(storage.getItem(ACCOUNT_PROMPT_DISMISSED_KEY)).toBe("1");
    expect(ask(29, true)).toBe(false);
    expect(DEVICE_BIRTH_KEY).toBe("bible-trivia-birth-v1");
  });
});
