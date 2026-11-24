import { loadState } from "../storage";
import { accountBirth, birthDateIso } from "./age-gate";
import { PASSWORD_RULE, signupErrorMessage, USERNAME_TAKEN } from "./auth-errors";
import { carryGuestProgress, clearPendingCarry, rememberPendingCarry } from "./session";
import { createProfileForNewAccount, isUsernameAvailable, signUpWithPassword } from "./supabase";
import { validateUsername } from "./username";

export type RegisterResult =
  | { status: "confirmation"; email: string }
  | { status: "ready" }
  | { status: "invalid"; message: string };

/**
 * The sign-up path Settings uses: birth date already on the device, then
 * signUpWithPassword, then createProfileForNewAccount when a session exists.
 * Guest progress moves with the same carry sign-in uses.
 */
export async function registerWithPassword(input: {
  email: string;
  password: string;
  /** Settings asks for one. The placement prompt does not. */
  username?: string;
}): Promise<RegisterResult> {
  const email = input.email.trim();
  if (input.password.length < 8) {
    return { status: "invalid", message: PASSWORD_RULE };
  }
  const readyBirth = accountBirth();
  if (!readyBirth) {
    return { status: "invalid", message: "Enter your birthday before creating an account." };
  }

  let username = "";
  if (input.username != null) {
    const name = validateUsername(input.username);
    if (!name.ok) return { status: "invalid", message: name.reason };
    try {
      if (!(await isUsernameAvailable(name.username))) {
        return { status: "invalid", message: USERNAME_TAKEN };
      }
    } catch (error) {
      return { status: "invalid", message: signupErrorMessage(error) };
    }
    username = name.username;
  }

  const birthDate = birthDateIso(readyBirth.birth);
  rememberPendingCarry(email);
  let signedUp = false;
  try {
    const result = await signUpWithPassword({
      email,
      password: input.password,
      username,
      birthDate,
      ageGroup: readyBirth.age,
    });
    signedUp = true;
    if (result.needsConfirmation) {
      return { status: "confirmation", email };
    }
    const local = typeof window === "undefined" ? null : loadState();
    try {
      await createProfileForNewAccount({
        username,
        ageGroup: readyBirth.age,
        birthDate,
        ...(local && local.ageGroup !== "child" ? { mascot: local.mascot } : {}),
      });
      await carryGuestProgress();
    } catch {
      // The account exists. Birth date is in the sign-up metadata, and the
      // same carry runs when the session is active.
    }
    return { status: "ready" };
  } catch (error) {
    if (!signedUp) clearPendingCarry();
    return { status: "invalid", message: signupErrorMessage(error) };
  }
}
