import type { PracticeSetStatus, Skill, StudyGoals, TestType } from "@/lib/domain";

export type BookRecord = {
  id: number;
  number: number;
  title: string;
  version: TestType;
  isCustom: 0 | 1;
};

export type PracticeSetRecord = {
  id: string;
  bookId: number | null;
  testNumber: number | null;
  moduleSkill: Skill;
  status: PracticeSetStatus;
  targetDate: string | null;
  isCustom: 0 | 1;
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

export type SettingRecord = {
  key: string;
  value: string;
};

export type AppData = {
  books: BookRecord[];
  sets: PracticeSetRecord[];
  attempts: AttemptRecord[];
  goals: StudyGoals[];
  settings: SettingRecord[];
};

export type AttemptWithSetAndBook = {
  attempt: AttemptRecord;
  set: PracticeSetRecord | null;
  book: BookRecord | null;
};
