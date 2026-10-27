import type { AgeGroup, MascotId, MascotLine, Moment } from "./types";

export type LinePickerOptions = {
  questionId?: string | null;
  random?: () => number;
};

/**
 * Random line for mascot + moment + audience.
 * A line tied to the current question wins over a general line.
 * A line for the player's age wins over audience "all".
 */
export function pickMascotLine(
  lines: MascotLine[],
  mascot: MascotId,
  moment: Moment,
  audience: AgeGroup,
  options: LinePickerOptions = {},
): MascotLine | null {
  const forMoment = lines.filter((line) => line.mascot === mascot && line.moment === moment);
  if (forMoment.length === 0) return null;

  const questionId = options.questionId ?? null;
  const specific = questionId
    ? forMoment.filter((line) => line.question_id === questionId)
    : [];
  const pool = specific.length > 0 ? specific : forMoment.filter((line) => line.question_id == null);

  const ageMatch = pool.filter((line) => line.audience === audience);
  const usable = ageMatch.length > 0 ? ageMatch : pool.filter((line) => line.audience === "all");
  if (usable.length === 0) return null;

  const random = options.random ?? Math.random;
  const index = Math.min(usable.length - 1, Math.max(0, Math.floor(random() * usable.length)));
  return usable[index] ?? null;
}

/** Conventional voiceover path. Plays only if that file exists at runtime. */
export function mascotLineAudioSrc(
  mascot: MascotId,
  line: Pick<MascotLine, "id" | "audio_file">,
): string {
  if (line.audio_file) {
    return line.audio_file.startsWith("/") ? line.audio_file : `/${line.audio_file}`;
  }
  return `/audio/${mascot}/${line.id}.mp3`;
}
