import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGE_GATE_KEY, DEVICE_BIRTH_KEY } from "@/lib/account/age-gate";
import {
  ACCOUNT_ROW_DELETES,
  deleteSignedInAccount,
  removeOwnedAccountRows,
  type AccountDeletionDb,
} from "@/lib/account/delete-account";
import {
  ACCOUNT_DELETED_MESSAGE,
  DELETE_ACCOUNT_PROMPT,
  DELETE_ACCOUNT_SIGNED_OUT,
  DELETE_ACCOUNT_UNAVAILABLE,
} from "@/lib/account/delete-account-copy";
import { clearStoredProgress } from "@/lib/account/session";
import { BADGE_SEEN_KEY } from "@/lib/game/badge-seen";
import { VERSE_MARKS_KEY } from "@/lib/bible/marks";
import { STORAGE_KEY } from "@/lib/storage";

const getUser = vi.hoisted(() => vi.fn());
const getUserClient = vi.hoisted(() => vi.fn());
const getServiceRoleClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/account/user-client", () => ({
  getUserClient: (token: string) => getUserClient(token),
}));

vi.mock("@/lib/account/service-role", () => ({
  getServiceRoleClient: () => getServiceRoleClient(),
}));

import { deleteMyAccount } from "@/app/account/delete-account";

const RAW = "password authentication failed for user postgres SUPER_SECRET_DB";

type Call = { op: string; table: string; column: string; value: string };

function memoryStorage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    items,
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

function adminMock(options?: { rowError?: { code?: string; message: string } | null; authError?: string | null }) {
  const calls: Call[] = [];
  const rowError = options?.rowError ?? null;
  const authError = options?.authError ?? null;
  const admin = {
    from(table: string) {
      return {
        select() {
          return {
            eq: async (column: string, value: string) => {
              calls.push({ op: "list", table, column, value });
              if (rowError && table === "profiles") return { data: null, error: rowError };
              return { data: [{ id: "comment-1" }], error: null };
            },
          };
        },
        delete() {
          return {
            eq: async (column: string, value: string) => {
              calls.push({ op: "delete", table, column, value });
              if (rowError && table === "profiles") return { error: rowError };
              return { error: null };
            },
            in: async (column: string, values: string[]) => {
              calls.push({ op: "delete-in", table, column, value: values.join(",") });
              return { error: null };
            },
          };
        },
      };
    },
    auth: {
      admin: {
        deleteUser: async (id: string, shouldSoftDelete?: boolean) => {
          calls.push({ op: "auth", table: "auth.users", column: String(shouldSoftDelete), value: id });
          if (authError) return { error: { message: authError } };
          return { error: null };
        },
      },
    },
  };
  return { admin, calls };
}

describe("delete account server action", () => {
  beforeEach(() => {
    getUser.mockReset();
    getUserClient.mockReset();
    getServiceRoleClient.mockReset();
    getUserClient.mockImplementation((token: string) =>
      token
        ? {
            auth: {
              getUser: (passed: string) => getUser(passed),
            },
          }
        : null,
    );
  });

  it("rejects a missing session and ignores a client id", async () => {
    const { admin, calls } = adminMock();
    getServiceRoleClient.mockReturnValue(admin);
    const result = await deleteMyAccount({ accessToken: "  ", userId: "attacker-id" });
    expect(result).toEqual({ ok: false, message: DELETE_ACCOUNT_SIGNED_OUT });
    expect(getUser).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("attacker-id");
  });

  it("uses the session user and ignores a different client id", async () => {
    const { admin, calls } = adminMock();
    getServiceRoleClient.mockReturnValue(admin);
    getUser.mockResolvedValue({ data: { user: { id: "real-user" } }, error: null });
    const result = await deleteMyAccount({ accessToken: "session-token", userId: "attacker-id" });
    expect(result).toEqual({ ok: true });
    expect(getUser).toHaveBeenCalledWith("session-token");
    const touched = calls.map((call) => call.value);
    expect(touched).toContain("real-user");
    expect(touched).not.toContain("attacker-id");
    expect(calls.at(-1)).toMatchObject({ op: "auth", column: "false", value: "real-user" });
    for (const step of ACCOUNT_ROW_DELETES) {
      expect(calls).toContainEqual({ op: "delete", table: step.table, column: step.column, value: "real-user" });
    }
    expect(calls[0]).toMatchObject({ op: "list", table: "devotion_comments", value: "real-user" });
  });

  it("does not delete anyone when the session cannot be verified", async () => {
    const { admin, calls } = adminMock();
    getServiceRoleClient.mockReturnValue(admin);
    getUser.mockResolvedValue({ data: { user: null }, error: { message: RAW } });
    const result = await deleteMyAccount({ accessToken: "session-token", userId: "attacker-id" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe(DELETE_ACCOUNT_SIGNED_OUT);
    expect(result.message).not.toContain("SUPER_SECRET");
    expect(result.message).not.toContain(RAW);
    expect(calls.filter((call) => call.op === "auth" || call.op === "delete")).toEqual([]);
  });

  it("keeps the auth user when a row delete fails and hides the raw error", async () => {
    const { admin, calls } = adminMock({ rowError: { message: RAW } });
    getServiceRoleClient.mockReturnValue(admin);
    getUser.mockResolvedValue({ data: { user: { id: "real-user" } }, error: null });
    const result = await deleteMyAccount({ accessToken: "session-token", userId: "real-user" });
    expect(result).toEqual({ ok: false, message: DELETE_ACCOUNT_UNAVAILABLE });
    expect(JSON.stringify(result)).not.toContain("SUPER_SECRET");
    expect(calls.some((call) => call.op === "auth")).toBe(false);
  });

  it("hides an auth deletion failure", async () => {
    const { admin } = adminMock({ authError: RAW });
    getServiceRoleClient.mockReturnValue(admin);
    getUser.mockResolvedValue({ data: { user: { id: "real-user" } }, error: null });
    const result = await deleteMyAccount({ accessToken: "session-token" });
    expect(result).toEqual({ ok: false, message: DELETE_ACCOUNT_UNAVAILABLE });
    expect(JSON.stringify(result)).not.toContain("postgres");
  });

  it("still removes the auth user when a table is not in this database yet", async () => {
    const { admin, calls } = adminMock({ rowError: { code: "42P01", message: 'relation "profiles" does not exist' } });
    getServiceRoleClient.mockReturnValue(admin);
    getUser.mockResolvedValue({ data: { user: { id: "real-user" } }, error: null });
    const result = await deleteMyAccount({ accessToken: "session-token", userId: "someone-else" });
    expect(result.ok).toBe(true);
    expect(calls.at(-1)).toMatchObject({ op: "auth", value: "real-user" });
  });
});

describe("owned row deletion", () => {
  it("stops before later tables when a delete fails", async () => {
    const seen: string[] = [];
    const db: AccountDeletionDb = {
      async listIds() {
        return { ids: [], error: null };
      },
      async deleteEq(table) {
        seen.push(table);
        if (table === "verse_marks") return { error: { message: RAW } };
        return { error: null };
      },
      async deleteIn() {
        return { error: null };
      },
    };
    await expect(removeOwnedAccountRows("real-user", db)).rejects.toThrow("row delete failed");
    expect(seen).toContain("devotion_comment_reports");
    expect(seen).toContain("verse_marks");
    expect(seen).not.toContain("profiles");
  });

  it("never passes a client id through the session deletion", async () => {
    const used: string[] = [];
    const result = await deleteSignedInAccount({
      accessToken: "token",
      clientUserId: "attacker-id",
      readUser: async () => ({ id: "real-user" }),
      removeOwnedRows: async (id) => {
        used.push(id);
      },
      deleteAuthUser: async (id) => {
        used.push(id);
      },
    });
    expect(result).toEqual({ ok: true });
    expect(used).toEqual(["real-user", "real-user"]);
  });
});

describe("local progress after deletion", () => {
  it("removes guest progress and leaves the device birth date", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: "{\"progress\":true}",
      [`${STORAGE_KEY}:judah`]: "{\"legacy\":true}",
      [VERSE_MARKS_KEY]: "[]",
      [BADGE_SEEN_KEY]: "{}",
      "bible-trivia-merge-declined": "user-1",
      "bible-trivia-pending-carry-email": "ada@example.com",
      [AGE_GATE_KEY]: "adult",
      [DEVICE_BIRTH_KEY]: "{\"year\":1990}",
    });
    clearStoredProgress(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}:judah`)).toBeNull();
    expect(storage.getItem(VERSE_MARKS_KEY)).toBeNull();
    expect(storage.getItem(BADGE_SEEN_KEY)).toBeNull();
    expect(storage.getItem("bible-trivia-merge-declined")).toBeNull();
    expect(storage.getItem("bible-trivia-pending-carry-email")).toBeNull();
    expect(storage.getItem(AGE_GATE_KEY)).toBe("adult");
    expect(storage.getItem(DEVICE_BIRTH_KEY)).toBe("{\"year\":1990}");
  });
});

describe("foreign keys to auth.users", () => {
  const root = path.join(process.cwd(), "supabase/migrations");
  const sql = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => fs.readFileSync(path.join(root, name), "utf8"))
    .join("\n");

  it("cascades every foreign key that points at auth.users", () => {
    const matches = [...sql.matchAll(/references\s+auth\.users\s*\(\s*id\s*\)([^,;]*)/gi)];
    expect(matches.length).toBeGreaterThanOrEqual(9);
    const missing = matches.filter((match) => !/on\s+delete\s+cascade/i.test(match[1] ?? ""));
    expect(missing.map((match) => match[0])).toEqual([]);
    for (const table of [
      "profiles",
      "question_progress",
      "verse_marks",
      "stage_progress",
      "question_awards",
      "devotion_likes",
      "devotion_comments",
      "devotion_comment_bans",
    ]) {
      expect(sql).toContain(`create table`);
      expect(sql).toMatch(new RegExp(`public\\.${table}[\\s\\S]{0,240}references\\s+auth\\.users\\s*\\(\\s*id\\s*\\)\\s+on\\s+delete\\s+cascade`, "i"));
    }
    expect(sql).toMatch(/reporter_id uuid not null references auth\.users \(id\) on delete cascade/);
    expect(sql).toMatch(/comment_id uuid not null references public\.devotion_comments \(id\) on delete cascade/);
    expect(sql).not.toMatch(/references\s+public\.profiles/i);
    expect(DELETE_ACCOUNT_PROMPT).toContain("cannot be recovered under any circumstances");
    expect(ACCOUNT_DELETED_MESSAGE.length).toBeGreaterThan(10);
  });
});
