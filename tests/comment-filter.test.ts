import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { biblicalIdolNames, biblicalNames, commentBlocklist } from "../config/comment-blocklist";
import { biblicalNamesAreUnblocked, reviewComment } from "@/lib/devotion/comment-filter";
import {
  COMMENT_DAILY_LIMIT,
  commentPostAllowed,
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

  it("allows posting only at 13 or older", () => {
    expect(commentPostAllowed({ birthDate: "2014-11-24", ageGroup: "teen" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: "2013-11-25", ageGroup: "teen" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: "2013-11-24", ageGroup: "teen" }, today)).toBe(true);
    expect(commentPostAllowed({ birthDate: "1990-01-01", ageGroup: "adult" }, today)).toBe(true);
    expect(commentPostAllowed({ birthDate: null, ageGroup: "teen" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: null, ageGroup: "adult" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: null, ageGroup: "older" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: null, ageGroup: "child" }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: null, ageGroup: null }, today)).toBe(false);
    expect(commentPostAllowed({ birthDate: "not-a-date", ageGroup: "adult" }, today)).toBe(false);
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
