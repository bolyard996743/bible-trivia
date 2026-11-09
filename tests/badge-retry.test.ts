import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BadgeRetryNotice } from "@/components/BadgeRetryNotice";
import { createLocalPlayerRepository } from "@/lib/account/repository";
import { createSupabasePlayerRepository, type AccountQuery } from "@/lib/account/supabase-db";
import { mergeBadgeRetries } from "@/lib/game/badge-retry";
import {
  BADGE_EARNED_NOTE,
  BADGE_RETRY_CAPTION,
  BADGE_RETRY_CARE,
  BADGE_RETRY_MS,
  BADGE_RETRY_WAIT,
  badgeRetryRemaining,
  formatBadgeCountdown,
  isBadgeWaiting,
  normalizeBadgeRetries,
  recordBadgeAnswer,
} from "@/lib/game/badge-retry";
import { badgeEarned, selectBadgeQuestion } from "@/lib/game/badges";
import { emptyProgress } from "@/lib/game/progression";
import type { GameProgress, MascotId, Question } from "@/lib/game/types";
import type { PathBadge } from "@/lib/game/path";
import { createState, parseState, STORAGE_KEY, type StoredState } from "@/lib/storage";

const badge: PathBadge = {
  id: "seed-noah",
  name: "Noah",
  art: "noah",
  questionIds: ["q1", "q2"],
};

const otherBadge: PathBadge = {
  id: "seed-jonah",
  name: "Jonah",
  art: "jonah",
  questionIds: ["j1"],
};

function question(id: string): Question {
  return {
    id,
    cycle: 1,
    tier: "foundation",
    testament: "OT",
    book: "Genesis",
    section: "Genesis 1-11",
    topics: ["sample"],
    placement_eligible: false,
    type: "multiple_choice",
    prompt: { adult: "Prompt?" },
    choices: [
      { id: "a", text: "Adam" },
      { id: "b", text: "God" },
    ],
    answer: "b",
    teaching: {
      verses: [{ ref: "Genesis 1:1", text: "In the beginning God created the heavens and the earth.", translation: "NKJV" }],
      explanation: { adult: "Look at the verse." },
      takeaway: "Takeaway.",
    },
    review: { status: "draft", notes: "" },
  };
}

const questions = [question("q1"), question("q2"), question("j1")];

function memory() {
  const items = new Map<string, string>();
  return {
    keys: () => [...items.keys()],
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

function player(mascot: MascotId, progress: Partial<GameProgress> = {}): StoredState {
  const base = createState("adult", mascot);
  return {
    ...base,
    placementComplete: true,
    placement: { cycle: 1, tier: "foundation", earned: 1, possible: 4, stage: "Seed" },
    progress: { ...emptyProgress(), ...progress },
  };
}

function tablesClient(options?: { rejectBadgeRetries?: boolean }) {
  const tables: Record<string, Record<string, unknown>[]> = {
    profiles: [],
    question_progress: [],
    verse_marks: [],
  };
  function from(table: string): AccountQuery {
    const eqs: [string, string][] = [];
    let deleting = false;
    const matching = () => (tables[table] ?? []).filter((row) => eqs.every(([column, value]) => row[column] === value));
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
          if (options?.rejectBadgeRetries && "badge_retries" in value) {
            return {
              error: { message: "Could not find the 'badge_retries' column of 'profiles' in the schema cache" },
            };
          }
          const list = tables[table] ?? [];
          const index = list.findIndex((row) => {
            if (table === "profiles") return row.user_id === value.user_id;
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
          tables[table] = (tables[table] ?? []).filter((row) => !eqs.every(([column, value]) => row[column] === value));
        }
        return Promise.resolve({ data: matching(), error: null }).then(onfulfilled);
      },
    };
    return api as AccountQuery;
  }
  return { from, tables };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("badge retry lock", () => {
  const start = new Date("2026-11-03T18:00:00.000Z");

  it("sets a 24 hour lock on any miss and clears that attempt", () => {
    let progress = recordBadgeAnswer(emptyProgress(), badge, "q1", true, start);
    expect(badgeEarned(progress, badge)).toBe(false);
    expect(selectBadgeQuestion(questions, progress, badge, start)?.id).toBe("q2");

    progress = recordBadgeAnswer(progress, badge, "q2", false, start);
    expect(progress.badgeRetries?.[badge.id]).toMatchObject({
      correctIds: [],
      retryAt: new Date(start.getTime() + BADGE_RETRY_MS).toISOString(),
    });
    expect(isBadgeWaiting(progress, badge.id, start)).toBe(true);
    expect(badgeEarned(progress, badge)).toBe(false);
    expect(selectBadgeQuestion(questions, progress, badge, start)).toBeNull();
    expect(isBadgeWaiting(progress, otherBadge.id, start)).toBe(false);

    const during = new Date(start.getTime() + 60_000);
    const ignored = recordBadgeAnswer(progress, badge, "q1", true, during);
    expect(ignored.badgeRetries?.[badge.id]?.retryAt).toBe(progress.badgeRetries?.[badge.id]?.retryAt);
    expect(ignored.badgeRetries?.[badge.id]?.correctIds).toEqual([]);
  });

  it("shows the countdown", () => {
    const now = Date.parse("2026-11-03T12:00:00.000Z");
    const retryAt = "2026-11-04T12:00:00.000Z";
    const html = renderToStaticMarkup(createElement(BadgeRetryNotice, { now, retryAt }));
    expect(html).toContain(BADGE_RETRY_WAIT);
    expect(html).toContain(BADGE_RETRY_CARE);
    expect(html).toContain(BADGE_RETRY_CAPTION);
    expect(html).toContain('data-testid="badge-retry-countdown"');
    expect(html).toContain("24:00:00");
    expect(html).not.toContain("already seen");
    expect(html.toLowerCase()).not.toMatch(/difficulty|foundation|intermediate|advanced|expert|wrong|fail|shame/);

    const next = renderToStaticMarkup(createElement(BadgeRetryNotice, { now: now + 1000, retryAt }));
    expect(next).toContain("23:59:59");
    expect(formatBadgeCountdown((90 * 60 + 5) * 1000)).toBe("01:30:05");
    expect(formatBadgeCountdown(BADGE_RETRY_MS + 2000)).toBe("24:00:00");
  });

  it("allows a retry after 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T18:26:00.000Z"));
    const progress = recordBadgeAnswer(emptyProgress(), badge, "q1", false, new Date());
    expect(isBadgeWaiting(progress, badge.id, new Date())).toBe(true);
    expect(selectBadgeQuestion(questions, progress, badge, new Date())).toBeNull();
    expect(formatBadgeCountdown(badgeRetryRemaining(progress, badge.id, new Date()))).toBe("24:00:00");

    vi.advanceTimersByTime(BADGE_RETRY_MS - 1000);
    expect(isBadgeWaiting(progress, badge.id, new Date())).toBe(true);
    expect(formatBadgeCountdown(badgeRetryRemaining(progress, badge.id, new Date()))).toBe("00:00:01");
    expect(selectBadgeQuestion(questions, progress, badge, new Date())).toBeNull();

    vi.advanceTimersByTime(1000);
    expect(isBadgeWaiting(progress, badge.id, new Date())).toBe(false);
    expect(selectBadgeQuestion(questions, progress, badge, new Date())?.id).toBe("q1");
  });

  it("earns the badge only when every question is right in that one attempt", () => {
    const later = new Date(start.getTime() + BADGE_RETRY_MS);
    let progress = recordBadgeAnswer(emptyProgress(), badge, "q1", true, start);
    progress = recordBadgeAnswer(progress, badge, "q2", false, start);
    expect(badgeEarned(progress, badge)).toBe(false);

    progress = recordBadgeAnswer(progress, badge, "q2", true, later);
    expect(progress.badgeRetries?.[badge.id]?.correctIds).toEqual(["q2"]);
    expect(badgeEarned(progress, badge)).toBe(false);
    expect(selectBadgeQuestion(questions, progress, badge, later)?.id).toBe("q1");

    progress = recordBadgeAnswer(progress, badge, "q1", true, later);
    expect(badgeEarned(progress, badge)).toBe(true);
    expect(progress.badgeRetries?.[badge.id]?.retryAt).toBeUndefined();
    expect(selectBadgeQuestion(questions, progress, badge, later)).toBeNull();

    const untouched = recordBadgeAnswer(progress, badge, "q1", false, later);
    expect(badgeEarned(untouched, badge)).toBe(true);
    expect(untouched.badgeRetries?.[badge.id]?.retryAt).toBeUndefined();
  });

  it("keeps an older save earned when every question was already a first try", () => {
    const progress = {
      ...emptyProgress(),
      masteredIds: ["q1", "q2"],
      firstTryIds: ["q1", "q2"],
    };
    expect(badgeEarned(progress, badge)).toBe(true);
    expect(recordBadgeAnswer(progress, badge, "q1", false, start).badgeRetries).toBeUndefined();
  });

  it("is per player and per badge, never per mascot", () => {
    const judah = recordBadgeAnswer(emptyProgress(), badge, "q1", false, start);
    const agnes = recordBadgeAnswer(emptyProgress(), badge, "q1", false, new Date(start.getTime() + 5000));
    expect(Object.keys(judah.badgeRetries ?? {})).toEqual([badge.id]);
    expect(JSON.stringify(judah.badgeRetries)).not.toMatch(/judah|agnes|shalom|zion|hunter/);
    expect(judah.badgeRetries?.[badge.id]?.retryAt).not.toBe(agnes.badgeRetries?.[badge.id]?.retryAt);

    const planted = normalizeBadgeRetries({
      judah: { correctIds: ["q1"], updatedAt: start.toISOString() },
      [badge.id]: { correctIds: ["q1"], updatedAt: start.toISOString() },
    });
    expect(Object.keys(planted ?? {})).toEqual([badge.id]);

    const hunterProgress = recordBadgeAnswer(emptyProgress(), otherBadge, "j1", true, start);
    const merged = mergeBadgeRetries(judah.badgeRetries, hunterProgress.badgeRetries);
    expect(Object.keys(merged ?? {}).sort()).toEqual([badge.id, otherBadge.id].sort());
    expect(merged).not.toHaveProperty("hunter");
  });
});

describe("badge retry storage", () => {
  const start = new Date("2026-11-03T18:00:00.000Z");

  it("round-trips the lock for a guest without a mascot key", async () => {
    const store = memory();
    const repo = createLocalPlayerRepository(store);
    const saved = player("agnes");
    saved.ageGroup = "child";
    saved.progress = recordBadgeAnswer(saved.progress, badge, "q1", false, start);
    await repo.save(saved);
    saved.mascot = "hunter";
    await repo.save(saved);

    expect(store.keys()).toEqual([STORAGE_KEY]);
    const raw = JSON.parse(store.getItem(STORAGE_KEY) ?? "{}") as { progress: { badgeRetries: Record<string, unknown> } };
    expect(Object.keys(raw.progress.badgeRetries)).toEqual([badge.id]);
    expect(raw.progress.badgeRetries).not.toHaveProperty("agnes");
    expect(raw.progress.badgeRetries).not.toHaveProperty("hunter");

    const loaded = await repo.load();
    expect(loaded?.mascot).toBe("hunter");
    expect(loaded?.progress.badgeRetries?.[badge.id]?.retryAt).toBe(new Date(start.getTime() + BADGE_RETRY_MS).toISOString());
    expect(badgeEarned(loaded!.progress, badge)).toBe(false);
  });

  it("drops a mascot key when a guest save is read", () => {
    const state = player("judah");
    state.progress = {
      ...state.progress,
      badgeRetries: {
        judah: { correctIds: ["q1"], updatedAt: start.toISOString() },
        [badge.id]: { correctIds: [], retryAt: new Date(start.getTime() + BADGE_RETRY_MS).toISOString(), updatedAt: start.toISOString() },
      },
    };
    const parsed = parseState(JSON.stringify(state));
    expect(Object.keys(parsed?.progress.badgeRetries ?? {})).toEqual([badge.id]);
    expect(isBadgeWaiting(parsed!.progress, badge.id, start)).toBe(true);
  });

  it("round-trips the lock for a signed-in player and keeps players apart", async () => {
    const client = tablesClient();
    const ada = createSupabasePlayerRepository(client, "ada");
    const bo = createSupabasePlayerRepository(client, "bo");
    const adaState = player("hunter");
    adaState.progress = recordBadgeAnswer(adaState.progress, badge, "q2", false, start);
    const boState = player("shalom");
    boState.progress = recordBadgeAnswer(boState.progress, otherBadge, "j1", true, start);

    await ada.save(adaState);
    await bo.save(boState);

    const adaRow = client.tables.profiles.find((row) => row.user_id === "ada");
    const boRow = client.tables.profiles.find((row) => row.user_id === "bo");
    expect(adaRow?.mascot).toBe("hunter");
    expect(adaRow?.badge_retries).toMatchObject({
      [badge.id]: { correctIds: [], retryAt: new Date(start.getTime() + BADGE_RETRY_MS).toISOString() },
    });
    expect(adaRow?.badge_retries).not.toHaveProperty("hunter");
    expect(boRow?.badge_retries).not.toHaveProperty(badge.id);
    expect(boRow?.badge_retries).toHaveProperty(otherBadge.id);

    const loadedAda = await ada.load();
    const loadedBo = await bo.load();
    expect(loadedAda?.progress.badgeRetries?.[badge.id]?.retryAt).toBe(adaState.progress.badgeRetries?.[badge.id]?.retryAt);
    expect(loadedBo?.progress.badgeRetries?.[otherBadge.id]?.correctIds).toEqual(["j1"]);
    expect(badgeEarned(loadedBo!.progress, otherBadge)).toBe(true);
    expect(loadedAda?.progress.badgeRetries).not.toHaveProperty(otherBadge.id);
    expect(JSON.stringify(client.tables.profiles)).not.toContain(BADGE_EARNED_NOTE);
  });

  it("still saves the account when the retry column is not applied yet", async () => {
    const client = tablesClient({ rejectBadgeRetries: true });
    const repo = createSupabasePlayerRepository(client, "ada");
    const state = player("zion");
    state.progress = recordBadgeAnswer({ ...state.progress, masteredIds: ["q1"] }, badge, "q1", false, start);
    await expect(repo.save(state)).resolves.toBeUndefined();
    const row = client.tables.profiles[0];
    expect(row).not.toHaveProperty("badge_retries");
    expect(row?.user_id).toBe("ada");
    expect(client.tables.question_progress).toEqual([
      expect.objectContaining({ user_id: "ada", question_id: "q1", mastered: true }),
    ]);
  });
});

describe("badge retry migration", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261103182600_badge_retries.sql"), "utf8");

  it("adds a per-player object keyed by badge id and does not store a mascot or a verse", () => {
    expect(sql).toContain("add column if not exists badge_retries jsonb not null default '{}'::jsonb");
    expect(sql).toContain("profiles_badge_retries_is_object");
    expect(sql).toContain("jsonb_typeof(badge_retries) = 'object'");
    expect(sql).toContain("never by mascot");
    expect(sql).toContain("No verse text");
    expect(sql).not.toMatch(/add column[^;]*mascot/i);
    expect(sql).not.toMatch(/verse_text|scripture_text/);
    expect(sql.toLowerCase()).not.toContain("service_role");
  });
});
