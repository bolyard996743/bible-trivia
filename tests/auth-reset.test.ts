import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LINK_EXPIRED, LINK_UNUSABLE } from "@/lib/account/auth-errors";
import { planAuthCallback, safeNextPath } from "@/lib/account/auth-callback";
import { skipsAgeGate } from "@/lib/shell-routes";

describe("password reset and confirmation links", () => {
  it("keeps the next page inside the app", () => {
    expect(safeNextPath("/auth/update-password")).toBe("/auth/update-password");
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("https://evil.example/auth/update-password")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/auth/update-password?extra=1")).toBe("/auth/update-password");
    expect(safeNextPath(null)).toBe("/account");
  });

  it("sends a recovery code to the new-password page and a signup code back into the app", () => {
    expect(planAuthCallback("?code=abc")).toEqual({ kind: "exchange", code: "abc", next: "/account" });
    expect(planAuthCallback("?code=abc&next=/auth/update-password")).toEqual({
      kind: "exchange",
      code: "abc",
      next: "/auth/update-password",
    });
    expect(planAuthCallback("?code=abc&next=https://evil.example")).toEqual({
      kind: "exchange",
      code: "abc",
      next: "/account",
    });
    expect(planAuthCallback("?token_hash=hash&type=recovery")).toEqual({
      kind: "verify",
      tokenHash: "hash",
      otpType: "recovery",
      next: "/auth/update-password",
    });
    expect(planAuthCallback("?token_hash=hash&type=signup")).toEqual({
      kind: "verify",
      tokenHash: "hash",
      otpType: "signup",
      next: "/account",
    });
  });

  it("hides provider error text from a failed email link", () => {
    const expired = planAuthCallback("", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    expect(expired).toEqual({ kind: "error", message: LINK_EXPIRED });
    if (expired.kind === "error") expect(expired.message).not.toContain("invalid or has expired");
    const other = planAuthCallback("?error=server_error&error_code=unexpected_failure&error_description=raw+boom");
    expect(other).toEqual({ kind: "error", message: LINK_UNUSABLE });
    if (other.kind === "error") expect(other.message).not.toContain("raw boom");
  });

  it("lets email links and legal pages open before a birthday is saved", () => {
    expect(skipsAgeGate("/auth/callback")).toBe(true);
    expect(skipsAgeGate("/auth/forgot-password")).toBe(true);
    expect(skipsAgeGate("/auth/update-password")).toBe(true);
    expect(skipsAgeGate("/privacy")).toBe(true);
    expect(skipsAgeGate("/terms")).toBe(true);
    expect(skipsAgeGate("/account")).toBe(false);
    expect(skipsAgeGate("/home")).toBe(false);
  });

  it("points the reset email at the update-password page and the sign-in screen at forgot password", () => {
    const supabase = readFileSync(path.join(process.cwd(), "src/lib/account/supabase.ts"), "utf8");
    const account = readFileSync(path.join(process.cwd(), "src/components/AccountScreen.tsx"), "utf8");
    expect(supabase).toMatch(/resetPasswordForEmail\([\s\S]*?passwordResetRedirectUrl\(\)/);
    expect(account).toContain('href="/auth/forgot-password"');
    expect(account).toContain("Forgot password?");
    expect(account).toContain("signInErrorMessage");
  });
});
