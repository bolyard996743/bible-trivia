import type { AgeGroup } from "../game/types";

/** Children never get an account option. Teen, adult, and older may sign in or stay guests. */
export function canOfferAccount(age: AgeGroup | null | undefined): boolean {
  return age === "teen" || age === "adult" || age === "older";
}

export type AccountAgeGroup = "teen" | "adult" | "older";

export function isAccountAge(age: AgeGroup): age is AccountAgeGroup {
  return canOfferAccount(age);
}
