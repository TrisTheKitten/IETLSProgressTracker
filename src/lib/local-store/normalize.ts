import {
  backupPayloadSchema,
  DEFAULT_GOALS,
  testTypeSchema,
  type BackupData,
} from "@/lib/domain";
import { appDataSchema, type AppData } from "./types";

function flagToBool(value: 0 | 1 | boolean | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return value === 1;
  return fallback;
}

/** Convert a v1 backup document into the live AppData model. */
export function appDataFromBackup(data: BackupData): AppData {
  const activeGoal =
    data.goals.find((goal) => goal.isActive === 1) ?? data.goals[0];

  const defaultTestTypeSetting = data.settings.find((row) => row.key === "defaultTestType");
  const parsedTestType = defaultTestTypeSetting
    ? testTypeSchema.safeParse(defaultTestTypeSetting.value)
    : null;
  const defaultTestType = parsedTestType?.success ? parsedTestType.data : undefined;

  return {
    books: data.books.map((book) => ({
      id: book.id,
      number: book.number,
      title: book.title,
      version: book.version,
      isCustom: flagToBool(book.isCustom, book.number === 99),
    })),
    sets: data.sets.map((set) => ({
      id: set.id,
      bookId: set.bookId,
      testNumber: set.testNumber,
      moduleSkill: set.moduleSkill,
      status: set.status,
      targetDate: set.targetDate,
      isCustom: flagToBool(set.isCustom),
    })),
    attempts: data.attempts.map((attempt) => ({
      id: attempt.id,
      practiceSetId: attempt.practiceSetId,
      date: attempt.date,
      skill: attempt.skill,
      rawScore: attempt.rawScore,
      bandScore: attempt.bandScore,
      notes: attempt.notes,
      duration: attempt.duration,
    })),
    goals: activeGoal
      ? {
          targetListening: activeGoal.targetListening,
          targetReading: activeGoal.targetReading,
          targetWriting: activeGoal.targetWriting,
          targetSpeaking: activeGoal.targetSpeaking,
          targetOverall: activeGoal.targetOverall,
        }
      : { ...DEFAULT_GOALS },
    settings: defaultTestType ? { defaultTestType } : {},
  };
}

/** Serialize live AppData into the portable v1 backup document. */
export function backupFromAppData(data: AppData): BackupData {
  return {
    books: data.books.map((book) => ({
      id: book.id,
      number: book.number,
      title: book.title,
      version: book.version,
      isCustom: book.isCustom ? 1 : 0,
    })),
    sets: data.sets.map((set) => ({
      id: set.id,
      bookId: set.bookId,
      testNumber: set.testNumber,
      moduleSkill: set.moduleSkill,
      status: set.status,
      targetDate: set.targetDate,
      isCustom: set.isCustom ? 1 : 0,
    })),
    attempts: data.attempts.map((attempt) => ({
      id: attempt.id,
      practiceSetId: attempt.practiceSetId,
      date: attempt.date,
      skill: attempt.skill,
      rawScore: attempt.rawScore,
      bandScore: attempt.bandScore,
      notes: attempt.notes,
      duration: attempt.duration,
    })),
    goals: [{ id: "active", ...data.goals, isActive: 1 as const }],
    settings: data.settings.defaultTestType
      ? [{ key: "defaultTestType", value: data.settings.defaultTestType }]
      : [],
  };
}

function looksLikeLegacyDocument(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const doc = raw as Record<string, unknown>;
  return Array.isArray(doc.goals) || Array.isArray(doc.settings);
}

/**
 * Accept live AppData or a legacy/v1 document blob (as previously stored in IDB
 * or nested in a backup) and return a validated live model.
 */
export function coerceAppData(raw: unknown): AppData {
  const live = appDataSchema.safeParse(raw);
  if (live.success) return live.data;

  if (looksLikeLegacyDocument(raw)) {
    const legacy = backupPayloadSchema.shape.data.safeParse(raw);
    if (legacy.success) return appDataFromBackup(legacy.data);
  }

  throw new Error("Stored app data failed validation");
}

export function parseBackupJson(jsonData: string): AppData {
  const payload = backupPayloadSchema.parse(JSON.parse(jsonData));
  return appDataFromBackup(payload.data);
}
