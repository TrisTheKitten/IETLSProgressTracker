import type {
  AttemptInput,
  CustomPracticeSetInput,
  GoalsInput,
  PracticeSetDetailsInput,
  PracticeSetEvent,
  TestType,
} from "@/lib/domain";
import { statusAfterAttemptCount, statusAfterPracticeSetEvent } from "@/lib/practice-set-lifecycle";
import { generateId, nextBookId } from "./ids";
import { backupFromAppData, parseBackupJson } from "./normalize";
import { createInitialAppData, ensureCambridgeCatalogueUpToDate } from "./seed";
import type { AppData, AttemptRecord, PracticeSetRecord } from "./types";

function updateSetStatus(sets: PracticeSetRecord[], setId: string, status: PracticeSetRecord["status"]) {
  return sets.map((set) => (set.id === setId ? { ...set, status } : set));
}

function attemptCountForSet(attempts: AttemptRecord[], setId: string) {
  return attempts.filter((attempt) => attempt.practiceSetId === setId).length;
}

export function saveAttempt(data: AppData, input: AttemptInput): { data: AppData; id: string } {
  const attemptId = input.id ?? generateId();

  const previous = input.id
    ? data.attempts.find((attempt) => attempt.id === input.id)
    : undefined;

  if (input.id && !previous) throw new Error("Practice attempt not found");

  const values: Omit<AttemptRecord, "id"> = {
    practiceSetId: input.practiceSetId ?? null,
    date: input.date,
    skill: input.skill,
    rawScore: input.rawScore ?? null,
    bandScore: input.bandScore,
    notes: input.notes ?? null,
    duration: input.duration ?? null,
  };

  let attempts: AttemptRecord[];
  if (input.id) {
    attempts = data.attempts.map((attempt) =>
      attempt.id === input.id ? { id: attempt.id, ...values } : attempt,
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

export function deleteAttempt(data: AppData, id: string): AppData {
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
  id: string,
  event: PracticeSetEvent,
): AppData {
  const practiceSet = data.sets.find((set) => set.id === id);
  if (!practiceSet) throw new Error("Practice set not found");

  const status = statusAfterPracticeSetEvent(practiceSet.status, event);
  return { ...data, sets: updateSetStatus(data.sets, id, status) };
}

export function updatePracticeSetDetails(
  data: AppData,
  id: string,
  input: PracticeSetDetailsInput,
): AppData {
  if (!data.sets.some((set) => set.id === id)) {
    throw new Error("Practice set not found");
  }

  return {
    ...data,
    sets: data.sets.map((set) =>
      set.id === id ? { ...set, targetDate: input.targetDate ?? null } : set,
    ),
  };
}

export function createCustomPracticeSet(
  data: AppData,
  input: CustomPracticeSetInput,
): { data: AppData; id: string } {
  const setId = generateId();
  const bookTitle = `Custom: ${input.bookName}`;

  const existingBook = data.books.find(
    (book) => book.title === bookTitle && book.isCustom,
  );

  let books = data.books;
  let bookId = existingBook?.id;
  if (bookId == null) {
    bookId = nextBookId(data.books);
    books = [
      ...data.books,
      {
        id: bookId,
        number: 0,
        title: bookTitle,
        version: "Academic",
        isCustom: true,
      },
    ];
  }

  const sets: PracticeSetRecord[] = [
    ...data.sets,
    {
      id: setId,
      bookId,
      testNumber: input.testNumber,
      moduleSkill: input.moduleSkill,
      status: "To Practice",
      targetDate: input.targetDate ?? null,
      isCustom: true,
    },
  ];

  return { data: { ...data, books, sets }, id: setId };
}

export function saveStudyGoals(data: AppData, goals: GoalsInput): AppData {
  return { ...data, goals: { ...goals } };
}

export function setDefaultTestType(data: AppData, value: TestType): AppData {
  return {
    ...data,
    settings: { ...data.settings, defaultTestType: value },
  };
}

export function exportData(data: AppData): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: backupFromAppData(data),
    },
    null,
    2,
  );
}

export function importData(jsonData: string): AppData {
  return ensureCambridgeCatalogueUpToDate(parseBackupJson(jsonData));
}

export function resetDatabase(): AppData {
  return createInitialAppData();
}
