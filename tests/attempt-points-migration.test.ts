import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261102120000_persist_attempt_scores.sql"),
  "utf8",
);

describe("attempt score migration", () => {
  it("scores from the stored miss count so a reload cannot award a first try", () => {
    expect(sql).toContain("award_question_points");
    expect(sql).toContain("greatest(public.question_progress.miss_count, excluded.miss_count)");
    expect(sql).toContain("question_progress");
    expect(sql).not.toContain("service_role");
    expect(sql).not.toContain("update public.profiles set points = 0");
    const body = sql.slice(sql.indexOf("as $$"));
    expect(body).toContain("coalesce(stored, reported) <= 0");
    expect(body).toContain("earned := 10");
    expect(body).toContain("earned := 5");
    expect(body).toContain("earned := 2");
    expect(sql).toContain("grant execute on function public.award_question_points(text, integer, text) to authenticated");
    expect(sql).toContain("revoke all on function public.award_question_points(text, integer, text) from public, anon");
  });
});
