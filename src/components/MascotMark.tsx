import { MASCOTS, type MascotId } from "@/lib/game/types";

export function MascotMark({
  mascot,
  size = "md",
}: {
  mascot: MascotId;
  size?: "md" | "lg";
}) {
  const info = MASCOTS[mascot];
  const dimension = size === "lg" ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl";
  return (
    <span
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-full bg-gold-soft`}
      aria-hidden="true"
    >
      {info.emoji}
    </span>
  );
}
