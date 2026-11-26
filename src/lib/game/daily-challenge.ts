import { stageRank } from "@/lib/curriculum";
import type { StoredState } from "@/lib/storage";
import { applyPlayedDay, isDayKey, type DailyChallengeRecord } from "@/lib/play/daily-streak";
import { badgeStageByQuestion, stageForQuestion } from "./question-stage";
import { knowledgePath, type KnowledgePathFile } from "./path";
import type { AgeGroup, GameProgress, KnowledgeStage, Question } from "./types";
import { pickWording } from "./wording";

export const DAILY_BADGE_NAME = "Daily";
export const DAILY_MISS_HEADING = "Here is the verse";
export const DAILY_MISS_NOTE = "You can try a new question tomorrow.";
export const DAILY_CORRECT_HEADING = "That's right";

export type DailyAsk = {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
};

export type DailyGradeResult = {
  correct: boolean;
  refs: string[];
};

function mix(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hasVerse(question: Question): boolean {
  return question.teaching.verses.some((verse) => verse.ref.trim().length > 0);
}

/**
 * One question for this day, from stages the player has already reached.
 * A requested id is ignored so a caller cannot pull a later stage.
 */
export function selectDailyQuestion(
  questions: readonly Question[],
  stage: KnowledgeStage,
  dayKey: string,
  path: KnowledgePathFile = knowledgePath,
  requestedId?: string | null,
): Question | null {
  void requestedId;
  if (!isDayKey(dayKey)) return null;
  const stages = badgeStageByQuestion(path);
  const rank = stageRank(stage);
  const pool = questions
    .filter((question) => {
      const owned = stages.get(question.id) ?? question.stage ?? "Seed";
      return stageRank(owned) <= rank && question.choices.length >= 2 && hasVerse(question);
    })
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return null;
  return pool[mix(`${dayKey}|${stage}`) % pool.length] ?? null;
}

export function resolveDailyQuestion(
  questions: readonly Question[],
  progress: GameProgress,
  dayKey: string,
  requestedId?: string | null,
): Question | null {
  return selectDailyQuestion(questions, progress.stage ?? "Seed", dayKey, knowledgePath, requestedId);
}

/** Prompt and choices only. The answer id is not included. */
export function toDailyAsk(question: Question, age: AgeGroup): DailyAsk {
  return {
    id: question.id,
    prompt: pickWording(question.prompt, age),
    choices: question.choices.map((choice) => ({ id: choice.id, text: choice.text })),
  };
}

/** Right or not, plus verse references. The correct choice text is not included. */
export function gradeDailyChoice(question: Question, choiceId: string): DailyGradeResult {
  return {
    correct: choiceId === question.answer,
    refs: question.teaching.verses.map((verse) => verse.ref.trim()).filter((ref) => ref.length > 0),
  };
}

export type DailyFinish = {
  day: string;
  questionId: string;
  correct: boolean;
  refs: string[];
};

/**
 * Records the daily question on the device.
 * Path badges, stage, points, mastery, and the 24-hour lock are left as they were.
 */
export function finishDailyChallenge(state: StoredState, input: DailyFinish): StoredState {
  if (state.dailyChallenge?.day === input.day) return state;
  const refs = input.refs.filter((ref) => ref.trim().length > 0 && ref.length <= 48);
  const dailyChallenge: DailyChallengeRecord = {
    day: input.day,
    questionId: input.questionId,
    correct: input.correct,
    refs,
  };
  const dailyPlay = applyPlayedDay(state.dailyPlay, input.day);
  const dailyBadges = input.correct && refs[0]
    ? [...(state.dailyBadges ?? []).filter((badge) => badge.day !== input.day), { day: input.day, ref: refs[0] }]
    : state.dailyBadges;
  return {
    ...state,
    progress: state.progress,
    dailyPlay,
    dailyChallenge,
    ...(dailyBadges && dailyBadges.length > 0 ? { dailyBadges } : {}),
  };
}

export function dailyQuestionStage(question: Question, path: KnowledgePathFile = knowledgePath): KnowledgeStage {
  return stageForQuestion(question, path);
}
