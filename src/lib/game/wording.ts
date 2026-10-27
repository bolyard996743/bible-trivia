import type { AgeGroup, Wording } from "./types";

/** Player age group, falling back to the required adult wording. */
export function pickWording(wording: Wording, age: AgeGroup): string {
  if (age === "adult") return wording.adult;
  const specific = wording[age];
  if (typeof specific === "string" && specific.trim().length > 0) return specific;
  return wording.adult;
}
