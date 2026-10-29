import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261028180000_phase4_accounts.sql"),
  "utf8",
);

const tables = ["profiles", "question_progress", "verse_marks"] as const;

describe("account migration row-level security", () => {
  it("enables RLS and gives each user only their own rows", () => {
    expect(migration.toLowerCase()).not.toContain("service_role");
    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      for (const action of ["select", "insert", "update", "delete"]) {
        expect(migration).toContain(`${table}_${action}_own`);
      }
    }
    const policies = migration.match(/create policy [\s\S]*?;/g) ?? [];
    expect(policies.length).toBe(12);
    for (const policy of policies) {
      expect(policy).toContain("auth.uid() = user_id");
    }
  });

  it("refuses child accounts and verse wording", () => {
    expect(migration).toContain("age_group in ('teen', 'adult', 'older')");
    expect(migration).not.toMatch(/verse_text|scripture_text|passage_text/);
    expect(migration).toContain("book_id text not null");
    expect(migration).toContain("verse_start");
    expect(migration).toContain("verse_end");
    expect(migration).not.toContain("grant select, insert, update, delete on public.profiles to anon");
  });
});
