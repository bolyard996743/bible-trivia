/**
 * Question difficulty labels are a testing flag.
 * Player Settings does not offer them. A production build never shows them.
 * In development or tests, set showDifficulty on the saved player, or open
 * play with ?showDifficulty=1.
 */
export function showDifficultyLabels(stored: boolean | undefined, search = ""): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (stored === true) return true;
  return new URLSearchParams(search).get("showDifficulty") === "1";
}
