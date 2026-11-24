import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_REGISTERED, PASSWORD_RULE, USERNAME_TAKEN } from "@/lib/account/auth-errors";
import { createState, writeLocalState, type StoredState } from "@/lib/storage";

const signUp = vi.hoisted(() => vi.fn());
const usernameAvailable = vi.hoisted(() => vi.fn(async (_name: string) => true));
const profileCreates = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));
const gate = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string; user_metadata?: { username?: string } },
}));
const remote = vi.hoisted(() => ({
  loaded: null as StoredState | null,
  saved: null as StoredState | null,
}));

vi.mock("@/lib/account/supabase", () => ({
  signUpWithPassword: (...args: unknown[]) => signUp(...args),
  createProfileForNewAccount: (input: Record<string, unknown>) => {
    profileCreates.calls.push(input);
    return Promise.resolve();
  },
  isUsernameAvailable: (name: string) => usernameAvailable(name),
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: gate.user } }),
    },
  }),
}));

vi.mock("@/lib/account/supabase-db", () => ({
  createSupabasePlayerRepository: () => ({
    kind: "supabase",
    load: async () => remote.loaded,
    save: async (state: StoredState) => {
      remote.saved = state;
    },
    loadMarks: async () => [],
    saveMarks: async () => {},
  }),
}));

import { saveDeviceBirthDate } from "@/lib/account/age-gate";
import { carryGuestProgress, pendingCarryEmail, resetAccountCarryForTests } from "@/lib/account/session";
import { registerWithPassword } from "@/lib/account/register-account";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

function seedGuest() {
  const state = createState("adult", "agnes");
  state.placementComplete = true;
  state.placement = { cycle: 1, tier: "foundation", earned: 3, possible: 4, stage: "Seed" };
  state.progress = {
    ...state.progress,
    masteredIds: ["q-placement"],
    placementIds: ["q-placement"],
    stage: "Seed",
    mapOrigin: "Seed",
  };
  writeLocalState(state, window.localStorage);
  saveDeviceBirthDate({ year: 1991, month: 4, day: 9 });
}

beforeEach(() => {
  signUp.mockReset();
  usernameAvailable.mockReset();
  usernameAvailable.mockResolvedValue(true);
  profileCreates.calls.length = 0;
  gate.user = null;
  remote.loaded = null;
  remote.saved = null;
  resetAccountCarryForTests();
  vi.stubGlobal("window", {
    localStorage: memoryStorage(),
    dispatchEvent: () => {},
  });
});

describe("placement sign-up reuses the account path", () => {
  it("saves the birth month and year and carries placement when confirmation is off", async () => {
    seedGuest();
    gate.user = { id: "user-1", email: "guest@example.com" };
    signUp.mockResolvedValue({ needsConfirmation: false });

    const result = await registerWithPassword({ email: " Guest@Example.com ", password: "longpassword1" });

    expect(result).toEqual({ status: "ready" });
    expect(signUp).toHaveBeenCalledWith({
      email: "Guest@Example.com",
      password: "longpassword1",
      username: "",
      birthDate: "1991-04-09",
      ageGroup: "adult",
    });
    expect(profileCreates.calls.some((call) => call.birthDate === "1991-04-09" && call.ageGroup === "adult")).toBe(true);
    expect(remote.saved?.placementComplete).toBe(true);
    expect(remote.saved?.placement).toMatchObject({ stage: "Seed", earned: 3 });
    expect(remote.saved?.progress.masteredIds).toEqual(["q-placement"]);
    expect(remote.saved?.mascot).toBe("agnes");
    expect(pendingCarryEmail()).toBeNull();
  });

  it("keeps the birth date for later and carries progress when the account becomes active", async () => {
    seedGuest();
    signUp.mockResolvedValue({ needsConfirmation: true });

    const pending = await registerWithPassword({ email: "guest@example.com", password: "longpassword1" });

    expect(pending).toEqual({ status: "confirmation", email: "guest@example.com" });
    expect(signUp.mock.calls[0][0].birthDate).toBe("1991-04-09");
    expect(profileCreates.calls).toEqual([]);
    expect(remote.saved).toBeNull();
    expect(pendingCarryEmail()).toBe("guest@example.com");

    gate.user = { id: "user-later", email: "guest@example.com" };
    remote.loaded = createState("adult", "judah");
    await carryGuestProgress();

    expect(profileCreates.calls.some((call) => call.birthDate === "1991-04-09" && call.ageGroup === "adult")).toBe(true);
    expect(remote.saved?.placementComplete).toBe(true);
    expect(remote.saved?.placement?.stage).toBe("Seed");
    expect(remote.saved?.progress.masteredIds).toEqual(["q-placement"]);
    expect(remote.saved?.mascot).toBe("agnes");
    expect(pendingCarryEmail()).toBeNull();
  });

  it("passes a chosen username through the same sign-up call Settings uses", async () => {
    seedGuest();
    gate.user = { id: "user-2", email: "river@example.com" };
    signUp.mockResolvedValue({ needsConfirmation: false });

    const result = await registerWithPassword({
      email: "river@example.com",
      password: "longpassword1",
      username: "River_1",
    });

    expect(result.status).toBe("ready");
    expect(usernameAvailable).toHaveBeenCalledWith("River_1");
    expect(signUp.mock.calls[0][0].username).toBe("River_1");
    expect(signUp.mock.calls[0][0].birthDate).toBe("1991-04-09");
  });
});

describe("sign-up errors stay kind", () => {
  it("rejects a short password before calling Supabase", async () => {
    seedGuest();
    const result = await registerWithPassword({ email: "guest@example.com", password: "short" });
    expect(result).toEqual({ status: "invalid", message: PASSWORD_RULE });
    expect(signUp).not.toHaveBeenCalled();
    expect(pendingCarryEmail()).toBeNull();
  });

  it("explains an email that is already registered", async () => {
    seedGuest();
    signUp.mockRejectedValue({ message: "User already registered", code: "user_already_exists", status: 422 });
    const result = await registerWithPassword({ email: "guest@example.com", password: "longpassword1" });
    expect(result).toEqual({ status: "invalid", message: EMAIL_REGISTERED });
    expect(pendingCarryEmail()).toBeNull();
  });

  it("explains a weak password returned by the server", async () => {
    seedGuest();
    signUp.mockRejectedValue({ message: "Password should be at least 6 characters", code: "weak_password", status: 422 });
    const result = await registerWithPassword({ email: "guest@example.com", password: "longpassword1" });
    expect(result).toEqual({ status: "invalid", message: PASSWORD_RULE });
  });

  it("explains a username that is already taken", async () => {
    seedGuest();
    usernameAvailable.mockResolvedValue(false);
    const result = await registerWithPassword({
      email: "guest@example.com",
      password: "longpassword1",
      username: "River_1",
    });
    expect(result).toEqual({ status: "invalid", message: USERNAME_TAKEN });
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("one sign-up implementation", () => {
  it("sends Settings and the placement prompt through registerWithPassword", () => {
    const account = fs.readFileSync(path.join(process.cwd(), "src/components/AccountScreen.tsx"), "utf8");
    const prompt = fs.readFileSync(path.join(process.cwd(), "src/components/SaveProgressPrompt.tsx"), "utf8");
    const registrar = fs.readFileSync(path.join(process.cwd(), "src/lib/account/register-account.ts"), "utf8");
    expect(account).toContain("registerWithPassword");
    expect(account).not.toContain("signUpWithPassword");
    expect(prompt).toContain("registerWithPassword");
    expect(prompt).not.toContain("signUpWithPassword");
    expect(registrar).toContain("signUpWithPassword");
    expect(registrar).toContain("createProfileForNewAccount");
    expect(registrar).toContain("carryGuestProgress");
  });
});
