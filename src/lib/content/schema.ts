import { z } from "zod";
import { CURRICULUM_TOPICS } from "../curriculum";
import {
  AGE_GROUPS,
  AUDIENCES,
  KNOWLEDGE_PATH,
  MASCOT_IDS,
  MOMENTS,
  TESTAMENTS,
  TIERS,
} from "../game/types";

export const wordingSchema = z
  .object({
    adult: z.string().min(1),
    child: z.string().min(1).optional(),
    teen: z.string().min(1).optional(),
    older: z.string().min(1).optional(),
  })
  .strict();

export const choiceSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

export const verseSchema = z
  .object({
    ref: z.string().min(1),
    text: z.string().min(1),
    translation: z.literal("NKJV"),
  })
  .strict();

export const questionSchema = z
  .object({
    id: z.string().min(1),
    cycle: z.number().int().positive(),
    tier: z.enum(TIERS),
    stage: z.enum(KNOWLEDGE_PATH),
    testament: z.enum(TESTAMENTS),
    book: z.string().min(1),
    section: z.string().min(1),
    topics: z.array(z.enum(CURRICULUM_TOPICS)).min(1),
    placement_eligible: z.boolean(),
    type: z.enum(["multiple_choice", "true_false"]),
    prompt: wordingSchema,
    choices: z.array(choiceSchema),
    answer: z.string().min(1),
    teaching: z
      .object({
        verses: z.array(verseSchema).min(1).max(3),
        explanation: wordingSchema,
        extended_explanation: z.string().min(1).optional(),
        takeaway: z.string().min(1),
      })
      .strict(),
    review: z
      .object({
        status: z.enum(["draft", "approved"]),
        notes: z.string(),
      })
      .strict(),
  })
  .strict()
  .superRefine((question, ctx) => {
    const expected = question.type === "true_false" ? 2 : 4;
    if (question.choices.length !== expected) {
      ctx.addIssue({
        code: "custom",
        message: `${question.id}: ${question.type} requires ${expected} choices`,
        path: ["choices"],
      });
    }
    const ids = question.choices.map((choice) => choice.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: `${question.id}: choice ids must be unique`,
        path: ["choices"],
      });
    }
    if (!ids.includes(question.answer)) {
      ctx.addIssue({
        code: "custom",
        message: `${question.id}: answer must match a choice id`,
        path: ["answer"],
      });
    }
  });

export const questionBatchSchema = z
  .object({
    format_version: z.literal(1),
    batch_id: z.string().min(1),
    author: z.string().min(1),
    questions: z.array(questionSchema).min(1),
  })
  .strict();

export const mascotLineSchema = z
  .object({
    id: z.string().min(1),
    moment: z.enum(MOMENTS),
    audience: z.enum(AUDIENCES),
    text: z.string().min(1),
    audio_file: z.string().min(1).nullable(),
    question_id: z.string().min(1).nullable(),
  })
  .strict();

export const mascotBatchSchema = z
  .object({
    format_version: z.literal(1),
    mascot: z.enum(MASCOT_IDS),
    author: z.string().min(1),
    lines: z.array(mascotLineSchema).min(1),
  })
  .strict();

export { AGE_GROUPS, MOMENTS };
