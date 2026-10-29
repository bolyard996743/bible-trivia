import { describe, expect, it } from "vitest";
import { validateUsername } from "@/lib/account/username";

describe("username rules", () => {
  it("accepts a simple name", () => {
    expect(validateUsername("Brave_Lamb")).toEqual({ ok: true, username: "Brave_Lamb" });
  });

  it("rejects length, symbols, profanity, and personal strings", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("this_name_is_too_long_for_us").ok).toBe(false);
    expect(validateUsername("bad name").ok).toBe(false);
    expect(validateUsername("cool-kid").ok).toBe(false);
    expect(validateUsername("kid@home.com").ok).toBe(false);
    expect(validateUsername("www.example.com").ok).toBe(false);
    expect(validateUsername("call5551234567").ok).toBe(false);
    expect(validateUsername("ohshit").ok).toBe(false);
    expect(validateUsername("Admin").ok).toBe(false);
  });
});
