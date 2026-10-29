import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261029210000_anon_leaderboard_top.sql"),
  "utf8",
);

describe("anon leaderboard top grant", () => {
  it("lets anonymous players execute only the existing top board", () => {
    expect(sql).toContain("grant execute on function public.leaderboard_top() to anon");
    expect(sql).not.toMatch(/user_id|email|birth_date/);
  });
});
