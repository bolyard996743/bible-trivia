import { mascotCelebrationClass } from "@/lib/play/mascot-celebration";
import { MASCOTS, type MascotId } from "@/lib/game/types";

export function MascotMark({
  mascot,
  size = "md",
  motion = "still",
}: {
  mascot: MascotId;
  size?: "md" | "lg";
  /** Still, or a short celebration. Reduced motion turns the animation off. */
  motion?: "still" | "correct" | "earned" | "celebrate";
}) {
  const info = MASCOTS[mascot];
  const dimension = size === "lg" ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl";
  const celebration = motion === "still" ? "" : mascotCelebrationClass(mascot);
  return (
    <span
      className={`relative inline-flex ${dimension} ${celebration} shrink-0 items-center justify-center rounded-full bg-gold-soft`}
      data-celebration={motion === "still" ? "still" : mascot}
      aria-hidden="true"
    >
      {info.emoji}
      {motion === "still" ? null : <MascotFlourish mascot={mascot} />}
    </span>
  );
}

function MascotFlourish({ mascot }: { mascot: MascotId }) {
  if (mascot === "judah") {
    return (
      <svg className="mascot-flourish pointer-events-none absolute -right-1 top-0 h-4 w-4 text-gold" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 6c2.2-2.4 4.4-2.4 6.4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2 10c2.6-2 5-2 7.4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (mascot === "shalom") {
    return (
      <svg className="mascot-flourish pointer-events-none absolute -left-2 top-2 h-4 w-10 text-calm" viewBox="0 0 40 16" aria-hidden="true">
        <path d="M20 8c-4-5-9-4-12 0 4 1 8 1 12 0z" fill="currentColor" />
        <path d="M20 8c4-5 9-4 12 0-4 1-8 1-12 0z" fill="currentColor" />
      </svg>
    );
  }
  if (mascot === "hunter") {
    return (
      <svg className="mascot-flourish pointer-events-none absolute -bottom-1 left-1 h-3 w-8 text-calm" viewBox="0 0 32 12" aria-hidden="true">
        <circle cx="6" cy="4" r="2" fill="currentColor" />
        <circle cx="16" cy="7" r="2.2" fill="currentColor" />
        <circle cx="25" cy="3" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  if (mascot === "zion") {
    return (
      <svg className="mascot-flourish pointer-events-none absolute -top-1 right-0 h-3 w-4 text-gold" viewBox="0 0 16 12" aria-hidden="true">
        <path d="M2 10c4-6 8-6 12 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}
