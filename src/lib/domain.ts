import { z } from "zod";

export const SKILLS = ["Listening", "Reading", "Writing", "Speaking"] as const;
export const PRACTICE_SET_STATUSES = ["Unstarted", "To Practice", "In Progress", "Completed"] as const;
export const TEST_TYPES = ["Academic", "General Training"] as const;

export const skillSchema = z.enum(SKILLS);
export const practiceSetStatusSchema = z.enum(PRACTICE_SET_STATUSES);
export const testTypeSchema = z.enum(TEST_TYPES);

export type Skill = z.infer<typeof skillSchema>;
export type PracticeSetStatus = z.infer<typeof practiceSetStatusSchema>;
export type TestType = z.infer<typeof testTypeSchema>;

export const bandScoreSchema = z.number().min(0).max(9)
  .refine((value) => Number.isInteger(value * 2), "Score must be in 0.5 increments");
const targetBandScoreSchema = bandScoreSchema.min(1, "Target must be at least 1");
const nullableDateSchema = z.union([z.iso.date(), z.null()]).optional();

export const goalsInputSchema = z.object({
  targetListening: targetBandScoreSchema,
  targetReading: targetBandScoreSchema,
  targetWriting: targetBandScoreSchema,
  targetSpeaking: targetBandScoreSchema,
  targetOverall: targetBandScoreSchema,
});
export type GoalsInput = z.infer<typeof goalsInputSchema>;

/** Live study targets — one active set, no history flag. */
export type StudyGoals = GoalsInput;

export const DEFAULT_GOALS: Readonly<StudyGoals> = Object.freeze({
  targetListening: 7,
  targetReading: 7,
  targetWriting: 6.5,
  targetSpeaking: 6.5,
  targetOverall: 7,
});

export function goalTargetForSkill(goals: GoalsInput, skill: Skill): number {
  const key = `target${skill}` as const;
  return goals[key];
}

export const attemptInputSchema = z.object({
  id: z.uuid().optional(),
  practiceSetId: z.union([z.uuid(), z.null()]).optional(),
  skill: skillSchema,
  date: z.iso.datetime(),
  rawScore: z.union([z.number().int().min(0).max(40), z.null()]).optional(),
  bandScore: bandScoreSchema,
  notes: z.union([z.string().max(10_000), z.null()]).optional(),
  duration: z.union([z.number().int().positive().max(1_440), z.null()]).optional(),
}).superRefine((value, context) => {
  if (value.rawScore != null && value.skill !== "Listening" && value.skill !== "Reading") {
    context.addIssue({ code: "custom", path: ["rawScore"], message: "Raw scores are only valid for Listening and Reading" });
  }
});
export type AttemptInput = z.infer<typeof attemptInputSchema>;

export const practiceSetDetailsInputSchema = z.object({ targetDate: nullableDateSchema });
export type PracticeSetDetailsInput = z.infer<typeof practiceSetDetailsInputSchema>;

export const customPracticeSetInputSchema = z.object({
  bookName: z.string().trim().min(1).max(200),
  testNumber: z.number().int().positive().max(10_000),
  moduleSkill: skillSchema,
  targetDate: nullableDateSchema,
});
export type CustomPracticeSetInput = z.infer<typeof customPracticeSetInputSchema>;

export const practiceSetEventSchema = z.enum(["plan", "unplan", "start"]);
export type PracticeSetEvent = z.infer<typeof practiceSetEventSchema>;

const flag01Schema = z.union([z.literal(0), z.literal(1)]);

const bookBackupSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int(),
  title: z.string().min(1).max(500),
  version: testTypeSchema,
  isCustom: flag01Schema.optional(),
}).transform((book) => ({
  ...book,
  isCustom: book.isCustom ?? (book.number === 99 ? 1 : 0),
}));

const practiceSetBackupSchema = z.object({
  id: z.string().min(1),
  bookId: z.number().int().positive().nullable(),
  testNumber: z.number().int().nullable(),
  moduleSkill: skillSchema,
  status: practiceSetStatusSchema,
  targetDate: z.string().nullable(),
  isCustom: flag01Schema,
});

const attemptBackupSchema = z.object({
  id: z.string().min(1),
  practiceSetId: z.string().nullable(),
  date: z.string().min(1),
  skill: skillSchema,
  rawScore: z.number().int().min(0).max(40).nullable(),
  bandScore: bandScoreSchema,
  notes: z.string().nullable(),
  duration: z.number().int().positive().nullable(),
});

const goalsBackupSchema = goalsInputSchema.extend({
  id: z.string().min(1),
  isActive: flag01Schema,
});

const settingBackupSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().max(10_000),
});

/** v1 portable backup envelope (export/import). Not the live in-memory model. */
export const backupPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  data: z.object({
    books: z.array(bookBackupSchema),
    sets: z.array(practiceSetBackupSchema),
    attempts: z.array(attemptBackupSchema),
    goals: z.array(goalsBackupSchema),
    settings: z.array(settingBackupSchema),
  }),
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type BackupData = BackupPayload["data"];
