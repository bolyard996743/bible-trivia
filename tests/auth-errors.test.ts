import { describe, expect, it } from "vitest";
import {
  CONFIRM_EMAIL_MESSAGE,
  EMAIL_REGISTERED,
  NETWORK_ERROR,
  PASSWORD_RULE,
  RATE_LIMIT_MESSAGE,
  SERVER_ERROR,
  UNCONFIRMED_EMAIL,
  USERNAME_TAKEN,
  WRONG_PASSWORD,
  passwordResetFeedback,
  signInErrorMessage,
  signupErrorMessage,
  updatePasswordErrorMessage,
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
    expect(signupErrorMessage({ message: "email rate limit exceeded", status: 429 })).toBe(RATE_LIMIT_MESSAGE);
    expect(signupErrorMessage({ message: "Failed to fetch", name: "TypeError" })).toBe(NETWORK_ERROR);
    expect(signupErrorMessage({ message: "Internal server error", status: 500 })).toBe(SERVER_ERROR);
    expect(signupErrorMessage({ message: "something unexpected" })).toBe(SERVER_ERROR);
    expect(signupErrorMessage({ message: "something unexpected" })).not.toMatch(/check the email and password/i);
    expect(signupErrorMessage({ message: "email rate limit exceeded", status: 429 })).not.toContain("email rate limit");
    expect(signupErrorMessage({ message: "Failed to fetch", name: "TypeError" })).not.toContain("Failed to fetch");
  });

  it("maps sign-in failures without repeating the provider's words", () => {
    const wrong = { message: "Invalid login credentials", code: "invalid_credentials", status: 400 };
    const missing = { message: "User not found", code: "user_not_found", status: 400 };
    const unconfirmed = { message: "Email not confirmed", code: "email_not_confirmed", status: 400 };
    expect(signInErrorMessage(wrong)).toBe(WRONG_PASSWORD);
    expect(signInErrorMessage(missing)).toBe(WRONG_PASSWORD);
    expect(signInErrorMessage(unconfirmed)).toBe(UNCONFIRMED_EMAIL);
    expect(signInErrorMessage({ message: "Request rate limit reached", code: "over_request_rate_limit", status: 429 })).toBe(
      RATE_LIMIT_MESSAGE,
    );
    expect(signInErrorMessage({ message: "Failed to fetch", name: "AuthRetryableFetchError" })).toBe(NETWORK_ERROR);
    expect(signInErrorMessage({ message: "database exploded", status: 500 })).toBe(SERVER_ERROR);
    for (const error of [wrong, missing, unconfirmed]) {
      expect(signInErrorMessage(error)).not.toContain(error.message);
    }
  });

  it("keeps password reset from saying whether the email is registered", () => {
    expect(passwordResetFeedback(null)).toEqual({
      ok: true,
      message: "If an account uses that email, we sent a link to choose a new password.",
    });
    expect(passwordResetFeedback({ message: "User not found", code: "user_not_found" })).toEqual(passwordResetFeedback(null));
    expect(passwordResetFeedback({ message: "For security purposes, you can only request this after 60 seconds.", status: 429, code: "over_email_send_rate_limit" }).message).toBe(
      RATE_LIMIT_MESSAGE,
    );
    expect(passwordResetFeedback({ message: "NetworkError when attempting to fetch resource." }).message).toBe(NETWORK_ERROR);
    expect(updatePasswordErrorMessage({ message: "Password should be at least 6 characters", code: "weak_password" })).toBe(
      PASSWORD_RULE,
    );
    expect(updatePasswordErrorMessage({ message: "New password should be different from the old password.", code: "same_password" })).not.toContain(
      "should be different from the old password",
    );
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
