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
function pickFromPool(pool: MascotLine[], audience: AgeGroup, random: () => number): MascotLine | null {
  const ageMatch = pool.filter((line) => line.audience === audience);
  const usable = ageMatch.length > 0 ? ageMatch : pool.filter((line) => line.audience === "all");
  if (usable.length === 0) return null;
  const index = Math.min(usable.length - 1, Math.max(0, Math.floor(random() * usable.length)));
  return usable[index] ?? null;
}

export function pickMascotLine(
  lines: MascotLine[],
  mascot: MascotId,
  moment: Moment,
  audience: AgeGroup,
  options: LinePickerOptions = {},
): MascotLine | null {
  const forMoment = lines.filter((line) => line.mascot === mascot && line.moment === moment);
  if (forMoment.length === 0) return null;

  const random = options.random ?? Math.random;
  const questionId = options.questionId ?? null;
  if (questionId) {
    const specific = pickFromPool(
      forMoment.filter((line) => line.question_id === questionId),
      audience,
      random,
    );
    if (specific) return specific;
  }
  return pickFromPool(
    forMoment.filter((line) => line.question_id == null),
    audience,
    random,
  );
}

const STAGE_LINE_ID = /^(?:judah|agnes|shalom|zion|hunter)-(?:seed|sprout|rooted)-/;

/**
 * Path play speaks the stage line for that question.
 * Placement keeps its own age-specific lines, which otherwise win over audience "all".
 */
export function linesForPathPlay(lines: MascotLine[]): MascotLine[] {
  const covered = new Set<string>();
  for (const line of lines) {
    if (line.question_id && STAGE_LINE_ID.test(line.id)) {
      covered.add(`${line.mascot}\0${line.moment}\0${line.question_id}`);
    }
  }
  if (covered.size === 0) return lines;
  return lines.filter((line) => {
    if (!line.question_id || STAGE_LINE_ID.test(line.id)) return true;
    return !covered.has(`${line.mascot}\0${line.moment}\0${line.question_id}`);
  });
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
