import type { AttemptPhase, MascotId } from "@/lib/game/types";
import { mascotCelebrationClass } from "@/lib/play/mascot-celebration";

/** How the guide's existing icon moves. A miss stays still. */
export type PlayReaction = "still" | "lean" | "cheer";

/**
 * Nod and lean while the player is choosing. Cheer on a correct answer.
 * A miss does not move the icon. Reduced motion keeps every phase still.
 */
export function playReaction(phase: AttemptPhase, reducedMotion: boolean): PlayReaction {
  if (reducedMotion) return "still";
  if (phase === "asking") return "lean";
  if (phase === "mastered") return "cheer";
  return "still";
}

export function reactionMotion(reaction: PlayReaction): "still" | "lean" | "correct" {
  if (reaction === "lean") return "lean";
  if (reaction === "cheer") return "correct";
  return "still";
}

/** Lean is a small transform of the profile icon. A cheer reuses that guide's existing motion. */
export function reactionClass(reaction: PlayReaction, mascot: MascotId): string {
  if (reaction === "lean") return "mascot-lean";
  if (reaction === "cheer") return mascotCelebrationClass(mascot);
  return "";
}
