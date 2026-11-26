import type { MascotId } from "@/lib/game/types";

/** Short motion for each guide. Reduced motion turns the class animation off. */
export const MASCOT_CELEBRATION: Record<MascotId, string> = {
  judah: "mascot-roar",
  shalom: "mascot-flutter",
  hunter: "mascot-splash",
  agnes: "mascot-hop",
  zion: "mascot-soar",
};

export function mascotCelebrationClass(mascot: MascotId): string {
  return MASCOT_CELEBRATION[mascot];
}
