import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261103183128_player_progress_not_mascot.sql"),
  "utf8",
);

describe("player progress migration", () => {
  it("backfills badge flags and only folds a mascot column when one exists", () => {
    expect(migration).toContain("set first_try_correct = true");
    expect(migration).toContain("miss_count = 0");
    expect(migration).toContain("column_name = 'mascot'");
    expect(migration).toContain("if not mascot_column then");
    expect(migration).toContain("add primary key (user_id, question_id)");
    expect(migration.toLowerCase()).not.toContain("service_role");
    expect(migration).not.toContain("grant ");
  });
});
