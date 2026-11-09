import { describe, expect, it } from "vitest";
import { mergeAccountProgress } from "@/lib/account/merge";
import { mergeBestPlayerState, withGuide } from "@/lib/account/player-progress";
import { badgeEarned } from "@/lib/game/badges";
import { isBadgeWaiting } from "@/lib/game/badge-retry";
import { emptyProgress } from "@/lib/game/progression";
import { createState, readLocalState, writeLocalState, STORAGE_KEY, type StoredState } from "@/lib/storage";

const badge = { id: "seed-creation", name: "Creation", art: "creation", questionIds: ["q1", "q2"] };

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
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
  };
}

function player(mascot: StoredState["mascot"], progress: Partial<StoredState["progress"]> = {}): StoredState {
  const state = createState("child", mascot);
  state.placementComplete = true;
  state.placement = { cycle: 1, tier: "foundation", earned: 1, possible: 13, stage: "Seed" };
  state.progress = { ...emptyProgress(), ...progress };
  return state;
}

describe("guide changes", () => {
  it("keeps badges, stage, placement, attempts, and points on the player", () => {
    const state = player("judah", {
      stage: "Sprout",
      masteredIds: ["q1", "q2"],
      firstTryIds: ["q1", "q2"],
      points: 40,
      streak: 2,
      bestStreak: 5,
      openAttempt: { questionId: "q3", missCount: 1, phase: "teaching" },
    });
    state.placement = { cycle: 1, tier: "foundation", earned: 8, possible: 13, stage: "Sprout" };
    const next = withGuide(state, { ageGroup: "child", mascot: "agnes", soundOn: false });
    expect(next.mascot).toBe("agnes");
    expect(next.soundOn).toBe(false);
    expect(next.progress.stage).toBe("Sprout");
    expect(next.progress.points).toBe(40);
    expect(next.progress.openAttempt?.questionId).toBe("q3");
    expect(next.placement).toEqual(state.placement);
    expect(badgeEarned(next.progress, badge)).toBe(true);
    const back = withGuide(next, { ageGroup: "child", mascot: "judah", soundOn: true });
    expect(back.mascot).toBe("judah");
    expect(badgeEarned(back.progress, badge)).toBe(true);
    expect(back.progress.points).toBe(40);
  });
});

describe("earned badges on reload", () => {
  it("stores first tries for a guest and reads them back", () => {
    const storage = memory();
    const state = player("judah", {
      stage: "Sprout",
      masteredIds: ["q1", "q2"],
      missCounts: { q1: 0 },
      firstTryIds: [],
      points: 20,
    });
    writeLocalState(state, storage);
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}") as StoredState;
    expect(saved.progress.firstTryIds?.slice().sort()).toEqual(["q1", "q2"]);
    const loaded = readLocalState(storage);
    expect(loaded?.progress.stage).toBe("Sprout");
    expect(loaded?.progress.points).toBe(20);
    expect(badgeEarned(loaded!.progress, badge)).toBe(true);
    const again = readLocalState(storage);
    expect(badgeEarned(again!.progress, badge)).toBe(true);
  });

  it("still shows a badge when an older save has mastery but an empty first-try list", () => {
    const storage = memory();
    const state = player("judah", { masteredIds: ["q1", "q2"], firstTryIds: [] });
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    const loaded = readLocalState(storage);
    expect(badgeEarned(loaded!.progress, badge)).toBe(true);
  });

  it("does not drop inferred badges when the account row has an empty list", () => {
    const local = player("judah", { masteredIds: ["q1", "q2"], missCounts: {} });
    delete local.progress.firstTryIds;
    const remote = player("agnes", { firstTryIds: [], masteredIds: [], points: 10 });
    const merged = mergeAccountProgress({ ...local, ageGroup: "adult" }, { ...remote, ageGroup: "adult" });
    expect(badgeEarned(merged.state!.progress, badge)).toBe(true);
    expect(merged.state?.progress.points).toBe(10);
  });
});

describe("mascot-keyed progress", () => {
  it("merges every guide's record into the player and keeps the best result", () => {
    const current = player("judah", { stage: "Seed", points: 5, masteredIds: ["q1"], firstTryIds: ["q1"] });
    current.placement = { cycle: 1, tier: "foundation", earned: 2, possible: 13, stage: "Seed" };
    const other = player("agnes", {
      stage: "Sprout",
      points: 40,
      bestStreak: 7,
      masteredIds: ["q2"],
      firstTryIds: ["q2"],
      openAttempt: { questionId: "q3", missCount: 2, phase: "asking" },
    });
    other.placement = { cycle: 1, tier: "foundation", earned: 9, possible: 13, stage: "Sprout" };
    const merged = mergeBestPlayerState([current, other], current.mascot);
    expect(merged?.mascot).toBe("judah");
    expect(merged?.progress.stage).toBe("Sprout");
    expect(merged?.progress.points).toBe(40);
    expect(merged?.progress.bestStreak).toBe(7);
    expect(merged?.placement?.stage).toBe("Sprout");
    expect(merged?.progress.openAttempt?.missCount).toBe(2);
    expect(badgeEarned(merged!.progress, badge)).toBe(true);
  });

  it("folds legacy keys and embedded slots once", () => {
    const storage = memory();
    const current = player("judah", { stage: "Seed", points: 5, firstTryIds: [], masteredIds: [] });
    const legacy = player("hunter", {
      stage: "Sprout",
      points: 40,
      masteredIds: ["q1", "q2"],
      firstTryIds: ["q1", "q2"],
    });
    legacy.placement = { cycle: 1, tier: "foundation", earned: 9, possible: 13, stage: "Sprout" };
    storage.setItem(STORAGE_KEY, JSON.stringify(current));
    storage.setItem(`${STORAGE_KEY}:hunter`, JSON.stringify(legacy));
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...current,
        progressByMascot: {
          agnes: {
            ...emptyProgress(),
            stage: "Seed",
            points: 15,
            masteredIds: ["q1"],
            firstTryIds: ["q1"],
          },
        },
      }),
    );
    const loaded = readLocalState(storage);
    expect(loaded?.mascot).toBe("judah");
    expect(loaded?.progress.stage).toBe("Sprout");
    expect(loaded?.progress.points).toBe(40);
    expect(loaded?.placement?.stage).toBe("Sprout");
    expect(badgeEarned(loaded!.progress, badge)).toBe(true);
    expect(storage.getItem(`${STORAGE_KEY}:hunter`)).toBeNull();
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}")).not.toHaveProperty("progressByMascot");
    const again = readLocalState(storage);
    expect(again?.progress.points).toBe(40);
    expect(badgeEarned(again!.progress, badge)).toBe(true);
    expect(storage.getItem(`${STORAGE_KEY}:hunter`)).toBeNull();
  });

  it("keeps an earned badge and a per-badge retry clock when guide copies merge", () => {
    const during = new Date("2026-11-03T18:30:00.000Z");
    const locked = player("judah", {
      masteredIds: ["q1"],
      firstTryIds: ["q1"],
      badgeRetries: {
        "seed-jonah": {
          correctIds: [],
          retryAt: "2026-11-04T18:00:00.000Z",
          updatedAt: "2026-11-03T18:00:00.000Z",
        },
      },
    });
    const earned = player("agnes", {
      masteredIds: ["q1", "q2"],
      firstTryIds: [],
    });
    const merged = mergeBestPlayerState([locked, earned], "judah");
    expect(merged?.mascot).toBe("judah");
    expect(badgeEarned(merged!.progress, badge)).toBe(true);
    expect(isBadgeWaiting(merged!.progress, "seed-jonah", during)).toBe(true);
    expect(merged?.progress.badgeRetries).not.toHaveProperty("judah");
    expect(merged?.progress.badgeRetries).not.toHaveProperty("agnes");
    const switched = withGuide(merged!, { ageGroup: "child", mascot: "hunter", soundOn: true });
    expect(switched.mascot).toBe("hunter");
    expect(switched.progress.badgeRetries?.["seed-jonah"]?.retryAt).toBe("2026-11-04T18:00:00.000Z");
    expect(badgeEarned(switched.progress, badge)).toBe(true);
    expect(isBadgeWaiting(switched.progress, "seed-jonah", during)).toBe(true);
  });
});
