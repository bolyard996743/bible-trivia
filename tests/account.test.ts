import { describe, expect, it } from "vitest";
import { stateWithBirthAge } from "@/lib/account/age-gate";
import { mergeAccountProgress } from "@/lib/account/merge";
import { canOfferAccount, showCreateAccountLink } from "@/lib/account/policy";
import { createLocalPlayerRepository, createSyncingRepository } from "@/lib/account/repository";
import { createSupabasePlayerRepository, type AccountQuery } from "@/lib/account/supabase-db";
import type { VerseMark } from "@/lib/bible/marks";
import { emptyProgress } from "@/lib/game/progression";
import { createState, type StoredState } from "@/lib/storage";

function memory() {
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

function state(age: StoredState["ageGroup"], progress: Partial<StoredState["progress"]> = {}): StoredState {
  const base = createState(age, "judah");
  return {
    ...base,
    placementComplete: true,
    placement: { cycle: 1, tier: "foundation", earned: 1, possible: 4, stage: "Seed" },
    progress: { ...emptyProgress(), ...progress },
  };
}

function mark(id: string, note: string, updatedAt: string): VerseMark {
  return {
    id,
    bookId: "JHN",
    chapter: 3,
    verseStart: 16,
    verseEnd: 16,
    color: "gold",
    note,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("account policy", () => {
  it("offers an account only to teen, adult, and older", () => {
    expect(canOfferAccount("child")).toBe(false);
    expect(canOfferAccount(null)).toBe(false);
    expect(canOfferAccount("teen")).toBe(true);
    expect(canOfferAccount("adult")).toBe(true);
    expect(canOfferAccount("older")).toBe(true);
  });

  it("shows Create account only while signed out and old enough", () => {
    expect(showCreateAccountLink({ signedIn: false, age: "teen" })).toBe(true);
    expect(showCreateAccountLink({ signedIn: false, age: "adult" })).toBe(true);
    expect(showCreateAccountLink({ signedIn: true, age: "adult" })).toBe(false);
    expect(showCreateAccountLink({ signedIn: false, age: "child" })).toBe(false);
    expect(showCreateAccountLink({ signedIn: false, age: null })).toBe(false);
  });
});

describe("merge", () => {
  it("keeps every mastered question and the higher miss count", () => {
    const local = state("adult", {
      cycle: 1,
      tier: "foundation",
      masteredIds: ["a"],
      missCounts: { a: 1, b: 2 },
      streak: 2,
      bestStreak: 2,
    });
    const remote = state("teen", {
      cycle: 2,
      tier: "advanced",
      masteredIds: ["b"],
      missCounts: { b: 4 },
      streak: 1,
      bestStreak: 5,
      seasonMasteredCount: 3,
    });
    const merged = mergeAccountProgress(local, remote, [mark("local", "On this device", "2026-10-28T00:00:00.000Z")], [
      mark("remote", "On the account", "2026-10-27T00:00:00.000Z"),
      mark("local", "Older note", "2026-10-01T00:00:00.000Z"),
    ]);
    expect(merged.upload).toBe(true);
    expect(merged.state?.progress.cycle).toBe(2);
    expect(merged.state?.progress.tier).toBe("advanced");
    expect(merged.state?.progress.masteredIds.sort()).toEqual(["a", "b"]);
    expect(merged.state?.progress.missCounts).toEqual({ a: 1, b: 4 });
    expect(merged.state?.progress.streak).toBe(2);
    expect(merged.state?.progress.bestStreak).toBe(5);
    expect(merged.state?.progress.seasonMasteredCount).toBe(3);
    expect(merged.state?.ageGroup).toBe("adult");
    expect(merged.marks.map((item) => item.id).sort()).toEqual(["local", "remote"]);
    expect(merged.marks.find((item) => item.id === "local")?.note).toBe("On this device");
  });

  it("moves questions, placement, and mentor into an account after a child turns 13", () => {
    const today = { year: 2026, month: 10, day: 29 };
    const local = state("child", { masteredIds: ["q1"], missCounts: { q1: 2 } });
    local.mascot = "hunter";
    const promoted = stateWithBirthAge(local, { year: 2013, month: 10, day: 29 }, today);
    expect(promoted.ageGroup).toBe("teen");
    const merged = mergeAccountProgress(promoted, null);
    expect(merged.upload).toBe(true);
    expect(merged.state?.mascot).toBe("hunter");
    expect(merged.state?.placementComplete).toBe(true);
    expect(merged.state?.placement?.tier).toBe("foundation");
    expect(merged.state?.progress.masteredIds).toEqual(["q1"]);
    expect(merged.state?.progress.missCounts).toEqual({ q1: 2 });
    const dayBefore = stateWithBirthAge(local, { year: 2013, month: 10, day: 30 }, today);
    expect(dayBefore.ageGroup).toBe("child");
    expect(mergeAccountProgress(dayBefore, null).upload).toBe(false);
  });

  it("does not upload a child's device", () => {
    const local = state("child", { masteredIds: ["a"], streak: 4, bestStreak: 4 });
    const remote = state("adult", { masteredIds: ["b"] });
    const merged = mergeAccountProgress(local, remote);
    expect(merged.upload).toBe(false);
    expect(merged.state?.ageGroup).toBe("child");
    expect(merged.state?.progress.masteredIds).toEqual(["a"]);
  });
});

describe("player repository", () => {
  it("writes the device first and skips the account for a child", async () => {
    const local = createLocalPlayerRepository(memory());
    const remote = createLocalPlayerRepository(memory());
    const syncing = createSyncingRepository(local, remote, true);
    const teen = state("teen", { masteredIds: ["q1"], missCounts: { q1: 2 } });
    await syncing.save(teen);
    expect((await remote.load())?.progress.masteredIds).toEqual(["q1"]);
    await syncing.save(state("child", { masteredIds: ["secret"] }));
    expect((await remote.load())?.ageGroup).toBe("teen");
    expect((await local.load())?.ageGroup).toBe("child");
  });

  it("round-trips progress through a mocked Supabase client without verse text", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {
      profiles: [],
      question_progress: [],
      verse_marks: [],
    };
    function from(table: string): AccountQuery {
      const eqs: [string, string][] = [];
      let deleting = false;
      const matching = () =>
        (tables[table] ?? []).filter((row) => eqs.every(([column, value]) => row[column] === value));
      const api = {
        select() {
          return api;
        },
        delete() {
          deleting = true;
          return api;
        },
        eq(column: string, value: string) {
          eqs.push([column, value]);
          return api;
        },
        async maybeSingle() {
          return { data: (matching()[0] as never) ?? null, error: null };
        },
        async upsert(values: unknown) {
          const rows = Array.isArray(values) ? values : [values];
          for (const value of rows as Record<string, unknown>[]) {
            if ("verse_text" in value || "scripture" in value) throw new Error("verse text");
            const list = tables[table] ?? [];
            const index = list.findIndex((row) => {
              if (table === "profiles") return row.user_id === value.user_id;
              if (table === "verse_marks") return row.user_id === value.user_id && row.id === value.id;
              return row.user_id === value.user_id && row.question_id === value.question_id;
            });
            if (index >= 0) list[index] = value;
            else list.push(value);
            tables[table] = list;
          }
          return { error: null };
        },
        then(onfulfilled: (value: { data: unknown; error: null }) => unknown) {
          if (deleting) {
            tables[table] = (tables[table] ?? []).filter(
              (row) => !eqs.every(([column, value]) => row[column] === value),
            );
          }
          return Promise.resolve({ data: matching(), error: null }).then(onfulfilled);
        },
      };
      return api as AccountQuery;
    }
    const repo = createSupabasePlayerRepository({ from }, "user-1");
    const saved = state("adult", { masteredIds: ["c1-gen-0001"], missCounts: { "c1-gen-0001": 2 }, streak: 3, bestStreak: 3 });
    await repo.save(saved);
    await repo.saveMarks([mark("mark-1", "A personal note", "2026-10-28T00:00:00.000Z")]);
    const loaded = await repo.load();
    expect(loaded?.progress.masteredIds).toEqual(["c1-gen-0001"]);
    expect(loaded?.progress.missCounts).toEqual({ "c1-gen-0001": 2 });
    expect(loaded?.progress.streak).toBe(3);
    expect(await repo.loadMarks()).toMatchObject([{ id: "mark-1", bookId: "JHN", note: "A personal note" }]);
    expect(JSON.stringify(tables.verse_marks)).not.toContain("loved the world");
    expect(tables.verse_marks[0]).not.toHaveProperty("verse_text");
    await expect(repo.save(state("child"))).rejects.toThrow(/Children cannot have accounts/);
  });
});
