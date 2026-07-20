import { z } from "zod";
import {
  goalsInputSchema,
  practiceSetStatusSchema,
  skillSchema,
  testTypeSchema,
  type PracticeSetStatus,
  type Skill,
  type StudyGoals,
  type TestType,
} from "@/lib/domain";

export type BookRecord = {
  id: number;
  number: number;
  title: string;
  version: TestType;
  isCustom: boolean;
};

export type PracticeSetRecord = {
  id: string;
  bookId: number | null;
  testNumber: number | null;
  moduleSkill: Skill;
  status: PracticeSetStatus;
  targetDate: string | null;
  isCustom: boolean;
};

export type AttemptRecord = {
  id: string;
  practiceSetId: string | null;
  date: string;
  skill: Skill;
  rawScore: number | null;
  bandScore: number;
  notes: string | null;
  duration: number | null;
};

export type AppSettings = {
  defaultTestType?: TestType;
};

export type AppData = {
  books: BookRecord[];
  sets: PracticeSetRecord[];
  attempts: AttemptRecord[];
  goals: StudyGoals;
  settings: AppSettings;
};

export type AttemptWithSetAndBook = {
  attempt: AttemptRecord;
  set: PracticeSetRecord | null;
  book: BookRecord | null;
};

const bookSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int(),
  title: z.string().min(1).max(500),
  version: testTypeSchema,
  isCustom: z.boolean(),
});

const practiceSetSchema = z.object({
  id: z.string().min(1),
  bookId: z.number().int().positive().nullable(),
  testNumber: z.number().int().nullable(),
  moduleSkill: skillSchema,
  status: practiceSetStatusSchema,
  targetDate: z.string().nullable(),
  isCustom: z.boolean(),
});

const attemptSchema = z.object({
  id: z.string().min(1),
  practiceSetId: z.string().nullable(),
  date: z.string().min(1),
  skill: skillSchema,
  rawScore: z.number().int().min(0).max(40).nullable(),
  bandScore: z.number().min(0).max(9),
  notes: z.string().nullable(),
  duration: z.number().int().positive().nullable(),
});

export const appDataSchema = z.object({
  books: z.array(bookSchema),
  sets: z.array(practiceSetSchema),
  attempts: z.array(attemptSchema),
  goals: goalsInputSchema,
  settings: z.object({
    defaultTestType: testTypeSchema.optional(),
  }),
});
