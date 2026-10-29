import { describe, expect, it } from "vitest";
import {
  CONFIRM_EMAIL_MESSAGE,
  EMAIL_REGISTERED,
  PASSWORD_RULE,
  SERVER_ERROR,
  USERNAME_TAKEN,
  signupErrorMessage,
} from "@/lib/account/auth-errors";
import { signupUserMetadata } from "@/lib/account/signup-metadata";

describe("sign-up errors", () => {
  it("names a taken username, a weak password, a registered email, and a server failure", () => {
    expect(signupErrorMessage({ message: "duplicate key value violates unique constraint profiles_username_lower", code: "23505" })).toBe(
      USERNAME_TAKEN,
    );
    expect(signupErrorMessage({ message: "Password should be at least 6 characters", code: "weak_password", status: 422 })).toBe(
      PASSWORD_RULE,
    );
    expect(PASSWORD_RULE).toContain("8");
    expect(signupErrorMessage({ message: "User already registered", code: "user_already_exists", status: 422 })).toBe(
      EMAIL_REGISTERED,
    );
    expect(signupErrorMessage({ message: "email rate limit exceeded", status: 429 })).toBe(SERVER_ERROR);
    expect(signupErrorMessage({ message: "Internal server error", status: 500 })).toBe(SERVER_ERROR);
    expect(signupErrorMessage({ message: "something unexpected" })).toBe(SERVER_ERROR);
    expect(signupErrorMessage({ message: "something unexpected" })).not.toMatch(/check the email and password/i);
  });

  it("uses the confirmation sentence and signup metadata fields", () => {
    expect(CONFIRM_EMAIL_MESSAGE).toBe("Check your email to confirm your account, then come back and sign in.");
    expect(
      signupUserMetadata({ username: "River_1", birthDate: "2000-01-01", ageGroup: "adult" }),
    ).toEqual({
      username: "River_1",
      birth_date: "2000-01-01",
      age_group: "adult",
    });
  });
});
