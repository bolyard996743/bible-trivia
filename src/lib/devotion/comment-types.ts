import type { MascotId } from "@/lib/game/types";

export type PublicComment = {
  id: string;
  body: string;
  createdAt: string;
  username: string;
  mascot: MascotId;
  mine: boolean;
};

export type AdminComment = {
  id: string;
  userId: string;
  username: string;
  mascot: MascotId;
  body: string;
  createdAt: string;
  devotionDate: string;
  hidden: boolean;
  removed: boolean;
  banned: boolean;
  reports: number;
  birthYear: number | null;
  birthMonth: number | null;
};
