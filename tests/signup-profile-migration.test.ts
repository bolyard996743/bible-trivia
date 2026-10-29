import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261029200000_profile_from_signup.sql"),
  "utf8",
);

describe("profile from signup migration", () => {
  it("creates a profile from auth metadata and locks the helper search path", () => {
    expect(sql).toContain("after insert on auth.users");
    expect(sql).toContain("security definer");
    expect(sql).toContain("raw_user_meta_data");
    expect(sql).toContain("birth date is under 13");
    expect(sql).toContain("public.username_is_allowed");
    expect(sql).toContain("chosen_username := null");
    expect(sql).toContain("execute function public.handle_new_user()");
    for (const name of [
      "public.age_group_from_birth_date",
      "public.apply_birth_date",
      "public.username_is_allowed",
      "public.prevent_username_change",
      "public.handle_new_user",
    ]) {
      const start = sql.indexOf(`function ${name}`);
      expect(start).toBeGreaterThan(-1);
      const body = sql.slice(start, sql.indexOf("$$;", start));
      expect(body).toContain("set search_path = ''");
    }
    expect(sql).not.toMatch(/set search_path = public/);
  });
});
