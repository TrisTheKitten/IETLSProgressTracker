import { z } from "zod";
import {
  attemptInputSchema,
  backupPayloadSchema,
  customPracticeSetInputSchema,
  goalsInputSchema,
  practiceSetDetailsInputSchema,
  practiceSetEventSchema,
  testTypeSchema,
} from "@/lib/domain";
import { statusAfterAttemptCount, statusAfterPracticeSetEvent } from "@/lib/practice-set-lifecycle";
import { createInitialAppData, ensureCambridgeCatalogueUpToDate } from "./seed";
import type { AppData, AttemptRecord, PracticeSetRecord } from "./types";

const idSchema = z.uuid();

function generateId() {
  return crypto.randomUUID();
}

function nextBookId(data: AppData): number {
  return data.books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
}

function updateSetStatus(sets: PracticeSetRecord[], setId: string, status: PracticeSetRecord["status"]) {
  return sets.map((set) => (set.id === setId ? { ...set, status } : set));
}

function attemptCountForSet(attempts: AttemptRecord[], setId: string) {
  return attempts.filter((attempt) => attempt.practiceSetId === setId).length;
}

export function saveAttempt(data: AppData, input: unknown): { data: AppData; id: string } {
  const parsed = attemptInputSchema.parse(input);
  const attemptId = parsed.id ?? generateId();

  const previous = parsed.id
    ? data.attempts.find((attempt) => attempt.id === parsed.id)
    : undefined;

  if (parsed.id && !previous) throw new Error("Practice attempt not found");

  const values: Omit<AttemptRecord, "id"> = {
    practiceSetId: parsed.practiceSetId ?? null,
    date: parsed.date,
    skill: parsed.skill,
    rawScore: parsed.rawScore ?? null,
    bandScore: parsed.bandScore,
    notes: parsed.notes ?? null,
    duration: parsed.duration ?? null,
  };

  let attempts: AttemptRecord[];
  if (parsed.id) {
    attempts = data.attempts.map((attempt) =>
      attempt.id === parsed.id ? { id: attempt.id, ...values } : attempt,
    );
  } else {
    attempts = [...data.attempts, { id: attemptId, ...values }];
  }

  let sets = data.sets;
  const oldSetId = previous?.practiceSetId;
  const newSetId = values.practiceSetId;

  if (oldSetId && oldSetId !== newSetId) {
    const count = attemptCountForSet(attempts, oldSetId);
    sets = updateSetStatus(sets, oldSetId, statusAfterAttemptCount(count));
  }

  if (newSetId) {
    if (!sets.some((set) => set.id === newSetId)) {
      throw new Error("Practice set not found");
    }
    sets = updateSetStatus(sets, newSetId, "Completed");
  }

  return { data: { ...data, attempts, sets }, id: attemptId };
}

export function deleteAttempt(data: AppData, input: unknown): AppData {
  const id = idSchema.parse(input);
  const attempt = data.attempts.find((row) => row.id === id);
  if (!attempt) throw new Error("Practice attempt not found");

  const attempts = data.attempts.filter((row) => row.id !== id);
  let sets = data.sets;

  if (attempt.practiceSetId) {
    const count = attemptCountForSet(attempts, attempt.practiceSetId);
    sets = updateSetStatus(sets, attempt.practiceSetId, statusAfterAttemptCount(count));
  }

  return { ...data, attempts, sets };
}

export function transitionPracticeSetStatus(
  data: AppData,
  idInput: unknown,
  eventInput: unknown,
): AppData {
  const id = idSchema.parse(idInput);
  const event = practiceSetEventSchema.parse(eventInput);
  const practiceSet = data.sets.find((set) => set.id === id);
  if (!practiceSet) throw new Error("Practice set not found");

  const status = statusAfterPracticeSetEvent(practiceSet.status, event);
  return { ...data, sets: updateSetStatus(data.sets, id, status) };
}

export function updatePracticeSetDetails(
  data: AppData,
  idInput: unknown,
  input: unknown,
): AppData {
  const id = idSchema.parse(idInput);
  const parsed = practiceSetDetailsInputSchema.parse(input);
  if (!data.sets.some((set) => set.id === id)) {
    throw new Error("Practice set not found");
  }

  return {
    ...data,
    sets: data.sets.map((set) =>
      set.id === id ? { ...set, targetDate: parsed.targetDate ?? null } : set,
    ),
  };
}

export function createCustomPracticeSet(
  data: AppData,
  input: unknown,
): { data: AppData; id: string } {
  const parsed = customPracticeSetInputSchema.parse(input);
  const setId = generateId();
  const bookTitle = `Custom: ${parsed.bookName}`;

  const existingBook = data.books.find(
    (book) => book.title === bookTitle && book.isCustom === 1,
  );

  let books = data.books;
  let bookId = existingBook?.id;
  if (bookId == null) {
    bookId = nextBookId(data);
    books = [
      ...data.books,
      {
        id: bookId,
        number: 0,
        title: bookTitle,
        version: "Academic",
        isCustom: 1,
      },
    ];
  }

  const sets: PracticeSetRecord[] = [
    ...data.sets,
    {
      id: setId,
      bookId,
      testNumber: parsed.testNumber,
      moduleSkill: parsed.moduleSkill,
      status: "To Practice",
      targetDate: parsed.targetDate ?? null,
      isCustom: 1,
    },
  ];

  return { data: { ...data, books, sets }, id: setId };
}

export function saveStudyGoals(data: AppData, input: unknown): AppData {
  const goals = goalsInputSchema.parse(input);
  return {
    ...data,
    goals: [
      ...data.goals.map((goal) => ({ ...goal, isActive: 0 as const })),
      { id: generateId(), ...goals, isActive: 1 },
    ],
  };
}

export function updateAppSetting(
  data: AppData,
  keyInput: unknown,
  valueInput: unknown,
): AppData {
  const key = z.literal("defaultTestType").parse(keyInput);
  const value = testTypeSchema.parse(valueInput);
  const settings = data.settings.some((row) => row.key === key)
    ? data.settings.map((row) => (row.key === key ? { key, value } : row))
    : [...data.settings, { key, value }];
  return { ...data, settings };
}

export function exportData(data: AppData): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  );
}

export function importData(
  jsonData: string,
): { data: AppData; success: true } | { success: false; error: string } {
  try {
    const payload = backupPayloadSchema.parse(JSON.parse(jsonData));
    return {
      success: true,
      data: ensureCambridgeCatalogueUpToDate(payload.data),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid backup file";
    return { success: false, error: message };
  }
}

export function resetDatabase(): AppData {
  return createInitialAppData();
}
