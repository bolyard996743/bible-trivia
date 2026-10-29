import type { AgeGroup } from "../game/types";

/** Children never get an account option. Teen, adult, and older may sign in or stay guests. */
export function canOfferAccount(age: AgeGroup | null | undefined): boolean {
  return age === "teen" || age === "adult" || age === "older";
}

export type AccountAgeGroup = "teen" | "adult" | "older";

export function isAccountAge(age: AgeGroup): age is AccountAgeGroup {
  return canOfferAccount(age);
}

/** Settings shows Create account only while signed out and old enough for an account. */
export function showCreateAccountLink(input: { signedIn: boolean; age: AgeGroup | null | undefined }): boolean {
  return !input.signedIn && canOfferAccount(input.age);
}
