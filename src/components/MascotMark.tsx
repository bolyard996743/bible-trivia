import { MASCOTS, type MascotId } from "@/lib/game/types";

export function MascotMark({
  mascot,
  size = "md",
  motion = "still",
}: {
  mascot: MascotId;
  size?: "md" | "lg";
  /** Short transform bounces. Reduced motion turns the animation off. */
  motion?: "still" | "correct" | "earned";
}) {
  const info = MASCOTS[mascot];
  const dimension = size === "lg" ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl";
  const bounce = motion === "correct" ? "mascot-bounce-sm" : motion === "earned" ? "mascot-bounce" : "";
  return (
    <span
      className={`inline-flex ${dimension} ${bounce} shrink-0 items-center justify-center rounded-full bg-gold-soft`}
      aria-hidden="true"
    >
      {info.emoji}
    </span>
  );
}
