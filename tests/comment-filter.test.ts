import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { biblicalIdolNames, biblicalNames, commentBlocklist } from "../config/comment-blocklist";
import { biblicalNamesAreUnblocked, reviewComment } from "@/lib/devotion/comment-filter";
import {
  COMMENT_DAILY_LIMIT,
  birthFieldsChangeAllowed,
  commentAccess,
  commentAgeReached,
  commentInsertDecision,
  hideOnReport,
  withinCommentRateLimit,
} from "@/lib/devotion/comment-policy";
import { ageGroupFromBirthDate } from "@/lib/account/age-gate";

const today = { year: 2026, month: 11, day: 24 };

describe("comment filter", () => {
  it("rejects profanity, including leetspeak, repeats, and spaced letters", () => {
    const profanity = reviewComment("this is shit");
    expect(profanity.ok).toBe(false);
    expect(reviewComment("this is SHIT").ok).toBe(false);
    if (!profanity.ok) {
      expect(profanity.message).toBe("Please take out words that don't belong in this conversation.");
    }
    expect(reviewComment("sh1t").ok).toBe(false);
    expect(reviewComment("a$$").ok).toBe(false);
    expect(reviewComment("fuuuuck").ok).toBe(false);
    expect(reviewComment("f.u.c.k").ok).toBe(false);
    expect(reviewComment("c u n t").ok).toBe(false);
    expect(reviewComment("@sshole").ok).toBe(false);
  });

  it("rejects threats and violent phrases", () => {
    const result = reviewComment("I will kill you");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("threats");
    expect(reviewComment("do not hurt you").ok).toBe(false);
    expect(reviewComment("a bomb").ok).toBe(false);
  });

  it("rejects names of other gods and not the God of the Bible", () => {
    for (const name of ["Allah", "Buddha", "Krishna", "Vishnu", "Shiva", "Brahma", "Ganesha", "Thor", "Odin", "Ra"]) {
      const result = reviewComment(name);
      expect(result.ok, name).toBe(false);
      if (!result.ok) expect(result.category).toBe("otherGods");
    }
    expect(biblicalNamesAreUnblocked()).toEqual([]);
    expect(reviewComment("God is good").ok).toBe(true);
    expect(reviewComment("Lord Jesus Christ").ok).toBe(true);
    expect(reviewComment("Yahweh and Jehovah").ok).toBe(true);
    expect(reviewComment("Holy Spirit, Messiah").ok).toBe(true);
    expect(reviewComment("Elijah beat the prophets of Baal").ok).toBe(true);
    expect(reviewComment("Paul in Ephesus with Diana").ok).toBe(true);
    expect(reviewComment("Zeus and Hermes in Acts").ok).toBe(true);
    expect(reviewComment("They served Molech and Milcom").ok).toBe(true);
    for (const name of [...biblicalNames, ...biblicalIdolNames]) {
      expect(reviewComment(name).ok, name).toBe(true);
      expect(reviewComment(`I trust ${name} today`).ok, name).toBe(true);
    }
  });

  it("rejects links, email addresses, and phone numbers", () => {
    expect(reviewComment("see https://example.com").ok).toBe(false);
    expect(reviewComment("www.example.com").ok).toBe(false);
    expect(reviewComment("write me at ada@example.com").ok).toBe(false);
    expect(reviewComment("call 555-123-4567").ok).toBe(false);
    const phone = reviewComment("call 555-123-4567");
    if (!phone.ok) expect(phone.category).toBe("contact");
  });

  it("allows ordinary words that only look like blocked text", () => {
    for (const text of [
      "assess the passage",
      "Scunthorpe",
      "a class assignment",
      "classic",
      "passion",
      "grape",
      "cocktail",
      "therapist",
      "assumption",
      "author",
      "thorough",
      "shift",
      "this",
      "prayer",
      "crisis",
      "Israel",
    ]) {
      expect(reviewComment(text).ok, text).toBe(true);
    }
  });

  it("limits the length to 280 characters", () => {
    expect(reviewComment("a".repeat(280)).ok).toBe(true);
    const long = reviewComment("a".repeat(281));
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.message).toBe("Please keep the comment to 280 characters.");
  });

  it("keeps every blocklist term in the migration", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261124183000_devotion_comments.sql"),
      "utf8",
    );
    for (const term of [...commentBlocklist.profanity, ...commentBlocklist.threats, ...commentBlocklist.otherGods]) {
      expect(sql, term).toContain(`'${term}'`);
    }
    for (const name of [...biblicalNames, ...biblicalIdolNames]) {
      expect(sql, name).not.toContain(`'${name}'`);
    }
    expect(sql).toContain("alter table public.devotion_comments enable row level security");
    expect(sql).toContain("devotion_comments_insert_own");
    expect(sql).toContain("devotion_comments_delete_own");
    expect(sql).toContain("(select auth.uid()) = user_id");
    expect(sql).toContain("(select auth.uid()) = reporter_id");
    expect(sql).toContain("hidden_at is null");
    expect(sql).toContain("grant execute on function public.devotion_comments_for_date(date) to authenticated");
    expect(sql).not.toContain("grant execute on function public.devotion_comments_for_date(date) to anon");
    expect(sql).toContain("comment rate limit");
    expect(sql).toContain("if not found or birth is null then");
    expect(sql).toContain("age_group_from_birth_date(birth) <> 'child'");
    expect(sql).not.toContain("group_name in ('teen', 'adult', 'older')");
    expect(sql).not.toMatch(/verse_text|scripture_text/);
  });
});

describe("comment posting rules", () => {
  it("treats child as under 13 and teen as 13 through 17", () => {
    expect(ageGroupFromBirthDate({ year: 2014, month: 11, day: 24 }, today)).toBe("child");
    expect(ageGroupFromBirthDate({ year: 2013, month: 11, day: 25 }, today)).toBe("child");
    expect(ageGroupFromBirthDate({ year: 2013, month: 11, day: 24 }, today)).toBe("teen");
    expect(ageGroupFromBirthDate({ year: 2009, month: 1, day: 1 }, today)).toBe("teen");
    expect(ageGroupFromBirthDate({ year: 2008, month: 11, day: 24 }, today)).toBe("adult");
  });

  it("counts 13 only after the birth month has fully passed", () => {
    expect(commentAgeReached(2013, 3, { year: 2026, month: 3, day: 31 })).toBe(false);
    expect(commentAgeReached(2013, 3, { year: 2026, month: 4, day: 1 })).toBe(true);
    expect(commentAgeReached(2013, 2, { year: 2026, month: 2, day: 28 })).toBe(false);
    expect(commentAgeReached(2013, 2, { year: 2026, month: 3, day: 1 })).toBe(true);
    expect(commentAgeReached(2012, 2, { year: 2025, month: 2, day: 28 })).toBe(false);
    expect(commentAgeReached(2012, 2, { year: 2025, month: 3, day: 1 })).toBe(true);
    expect(commentAgeReached(2013, 12, { year: 2026, month: 12, day: 31 })).toBe(false);
    expect(commentAgeReached(2013, 12, { year: 2027, month: 1, day: 1 })).toBe(true);
  });

  it("keeps guests and players without a birth date from posting", () => {
    expect(commentAccess({ signedIn: false }, today)).toEqual({
      canPost: false,
      needsBirthDate: false,
      under13: false,
    });
    expect(commentInsertDecision({ signedIn: false, countToday: 0 }, today)).toEqual({
      ok: false,
      message: "Sign in to comment.",
    });
    const missing = commentAccess({ signedIn: true, birthDate: null, birthYear: null, birthMonth: null }, today);
    expect(missing.needsBirthDate).toBe(true);
    expect(missing.canPost).toBe(false);
    expect(commentInsertDecision({ signedIn: true, countToday: 0 }, today).ok).toBe(false);
  });

  it("keeps under 13 read-only and lets 13+ post", () => {
    const younger = commentAccess({ signedIn: true, birthYear: 2014, birthMonth: 3 }, today);
    expect(younger).toEqual({ canPost: false, needsBirthDate: false, under13: true });
    expect(commentInsertDecision({ signedIn: true, birthYear: 2014, birthMonth: 3, countToday: 0 }, today).ok).toBe(false);
    const older = commentAccess({ signedIn: true, birthYear: 2013, birthMonth: 3 }, { year: 2026, month: 4, day: 1 });
    expect(older.canPost).toBe(true);
    expect(commentInsertDecision({ signedIn: true, birthYear: 2013, birthMonth: 3, countToday: 0 }, { year: 2026, month: 4, day: 1 }).ok).toBe(true);
    const fromDate = commentAccess({ signedIn: true, birthDate: "2013-03-15" }, { year: 2026, month: 3, day: 31 });
    expect(fromDate.canPost).toBe(false);
    expect(commentAccess({ signedIn: true, birthDate: "2013-03-15" }, { year: 2026, month: 4, day: 1 }).canPost).toBe(true);
  });

  it("stops a player from changing a saved birth date", () => {
    const saved = { birthDate: "2010-04-02", year: null, month: null };
    expect(
      birthFieldsChangeAllowed({
        actor: "owner",
        previous: saved,
        next: { birthDate: "2000-01-01", year: null, month: null },
      }),
    ).toBe(false);
    expect(
      birthFieldsChangeAllowed({
        actor: "owner",
        previous: { birthDate: null, year: null, month: null },
        next: { birthDate: null, year: 2010, month: 4 },
      }),
    ).toBe(true);
    expect(
      birthFieldsChangeAllowed({
        actor: "owner",
        previous: { birthDate: null, year: 2010, month: 4 },
        next: { birthDate: null, year: 2000, month: 1 },
      }),
    ).toBe(false);
    expect(
      birthFieldsChangeAllowed({
        actor: "service",
        previous: saved,
        next: { birthDate: "2000-01-01", year: 2000, month: 1 },
      }),
    ).toBe(true);
    expect(
      birthFieldsChangeAllowed({
        actor: "other",
        previous: { birthDate: null, year: null, month: null },
        next: { birthDate: null, year: 2010, month: 4 },
      }),
    ).toBe(false);
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261124210000_comment_birth_month.sql"),
      "utf8",
    );
    expect(sql).toContain("raise exception 'birth date is locked'");
    expect(sql).toContain("if (select auth.uid()) is null then");
    expect(sql).toContain("return public.comment_age_reached");
    expect(sql).toContain("if birth is null then");
    expect(sql).toContain("interval '1 month'");
  });

  it("lets guests read visible comments without private profile fields", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261124213000_comment_guest_read.sql"),
      "utf8",
    );
    expect(sql).toContain("for select to anon");
    expect(sql).toContain("hidden_at is null and removed_at is null");
    expect(sql).toContain("grant select (id, devotion_id, devotion_date, body, created_at)");
    expect(sql).not.toContain("grant select (id, user_id");
    expect(sql).toContain("grant execute on function public.devotion_comments_for_date(date) to anon, authenticated");
    const selected = sql.slice(sql.lastIndexOf("select"), sql.indexOf("from public.devotion_comments"));
    expect(selected).not.toMatch(/birth_date|comment_birth|email/);
    expect(sql).toContain("coalesce(nullif(p.username, ''), 'Player')");
    expect(commentInsertDecision({ signedIn: false, countToday: 0 }, today).ok).toBe(false);
  });

  it("allows three comments per player per day", () => {
    expect(COMMENT_DAILY_LIMIT).toBe(3);
    expect(withinCommentRateLimit(0)).toBe(true);
    expect(withinCommentRateLimit(2)).toBe(true);
    expect(withinCommentRateLimit(3)).toBe(false);
    expect(withinCommentRateLimit(4)).toBe(false);
  });

  it("hides a comment for everyone after one report", () => {
    const visible = { id: "c1", hiddenAt: null as string | null };
    const hidden = hideOnReport(visible, "2026-11-24T18:00:00.000Z");
    expect(hidden.hiddenAt).toBe("2026-11-24T18:00:00.000Z");
    expect(hideOnReport(hidden, "2026-11-24T19:00:00.000Z").hiddenAt).toBe("2026-11-24T18:00:00.000Z");
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261124183000_devotion_comments.sql"),
      "utf8",
    );
    expect(sql).toContain("set hidden_at = coalesce(hidden_at, now())");
    expect(sql).toContain("after insert on public.devotion_comment_reports");
  });
});
