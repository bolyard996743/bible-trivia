export { orderChoicesForRetry, shuffleChoices } from "./choices";
export { explanationRevealIssues, textContainsChoice } from "./reveal";
export {
  acknowledgeTeaching,
  shouldShowExtended,
  shouldShowTakeaway,
  startAttempt,
  submitAnswer,
  wasFirstAttempt,
} from "./mastery";
export { mascotLineAudioSrc, pickMascotLine } from "./mascot";
export {
  PLACEMENT_BANDS,
  TIER_WEIGHT,
  placementFromRatio,
  scorePlacement,
  selectPlacementQuestions,
} from "./placement";
export {
  applyMastery,
  currentSection,
  emptyProgress,
  knowledgeStage,
  nextQuestion,
  sectionsFor,
  stageIndex,
} from "./progression";
export type { ProgressEvent } from "./progression";
export {
  AGE_GROUPS,
  AGE_LABELS,
  AUDIENCES,
  KNOWLEDGE_PATH,
  MASCOT_IDS,
  MASCOTS,
  MOMENTS,
  TESTAMENTS,
  TIER_LABELS,
  TIERS,
} from "./types";
export type {
  AgeGroup,
  AttemptState,
  Audience,
  GameProgress,
  KnowledgeStage,
  MascotId,
  MascotLine,
  Moment,
  PlacementAttempt,
  PlacementResult,
  Question,
  Tier,
  Wording,
} from "./types";
export { pickWording } from "./wording";
