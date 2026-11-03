import { MASCOTS, type MascotId } from "@/lib/game/types";

const SIZES = {
  sm: "h-10 w-10 text-xl",
  md: "h-12 w-12 text-2xl",
  lg: "h-16 w-16 text-3xl",
} as const;

/** Static profile mark. Mascots are not animated. */
export function ProfileIcon({
  mascot,
  size = "md",
  labelled = false,
}: {
  mascot: MascotId;
  size?: keyof typeof SIZES;
  labelled?: boolean;
}) {
  const info = MASCOTS[mascot];
  return (
    <span
      data-testid={`profile-icon-${mascot}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gold-soft ${SIZES[size]}`}
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? `${info.name} profile icon` : undefined}
    >
      {info.emoji}
    </span>
  );
}
