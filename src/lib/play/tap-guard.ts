/** Ignore a tap that lands before the player has had a moment to see the new screen. */
export const TAP_GUARD_MS = 600;

export function acceptGuardedTap(input: {
  now: number;
  shownAt: number;
  alreadySubmitted: boolean;
  guardMs?: number;
}): { accepted: boolean; submitted: boolean } {
  if (input.alreadySubmitted) return { accepted: false, submitted: true };
  const guardMs = input.guardMs ?? TAP_GUARD_MS;
  if (input.now - input.shownAt < guardMs) return { accepted: false, submitted: false };
  return { accepted: true, submitted: true };
}
