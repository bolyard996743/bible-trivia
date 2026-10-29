import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BLOCKED_USERNAME_PARTS } from "@/lib/account/username";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261029180000_usernames_and_leaderboards.sql"),
  "utf8",
);

describe("username and leaderboard migration", () => {
  it("locks usernames, filters them, and exposes only public board columns", () => {
    expect(sql).toContain("username cannot be changed");
    expect(sql).toContain("profiles_username_permanent");
    expect(sql).toContain("username_is_allowed");
    for (const word of BLOCKED_USERNAME_PARTS) expect(sql).toContain(`'${word}'`);
    expect(sql).toContain("leaderboard_top");
    expect(sql).toContain("leaderboard_near");
    expect(sql).toContain("leaderboard_around_score");
    expect(sql).not.toMatch(/kid_board|device_token|anonymous/);
    const around = sql.slice(sql.indexOf("function public.leaderboard_around_score"));
    expect(around).not.toContain("user_id");
    expect(around).not.toContain("email");
    expect(around).not.toContain("birth_date");
    const boards = sql.slice(sql.indexOf("function public.leaderboard_ranked"));
    expect(boards).not.toContain("birth_date");
    expect(sql).toContain("birth_date date");
    expect(sql).toContain("birth date is under 13");
    expect(sql).toContain("new.age_group := group_name");
    expect(sql).toContain("age_group_from_birth_date");
  });

  it("rewrites row policies to the select auth.uid() form", () => {
    const policies = sql.match(/create policy [\s\S]*?;/g) ?? [];
    expect(policies.length).toBe(12);
    for (const policy of policies) {
      expect(policy).toContain("(select auth.uid()) = user_id");
    }
  });
});
