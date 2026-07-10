"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { seedCambridgeCatalogue } from "@/db/cambridge-catalogue";
import * as schema from "@/db/schema";
import {
  attemptInputSchema,
  backupPayloadSchema,
  customPracticeSetInputSchema,
  DEFAULT_GOALS,
  goalsInputSchema,
  practiceSetDetailsInputSchema,
  practiceSetEventSchema,
  testTypeSchema,
} from "@/lib/domain";
import { statusAfterAttemptCount, statusAfterPracticeSetEvent } from "@/lib/practice-set-lifecycle";

const idSchema = z.uuid();

function generateId() {
  return crypto.randomUUID();
}

function revalidateApplication() {
  revalidatePath("/", "layout");
}

export async function saveAttempt(input: unknown) {
  const data = attemptInputSchema.parse(input);
  const attemptId = data.id ?? generateId();

  db.transaction((tx) => {
    const previous = data.id
      ? tx.select({ practiceSetId: schema.practiceAttempts.practiceSetId })
          .from(schema.practiceAttempts).where(eq(schema.practiceAttempts.id, data.id)).get()
      : undefined;

    if (data.id && !previous) throw new Error("Practice attempt not found");

    const values = {
      practiceSetId: data.practiceSetId ?? null,
      date: data.date,
      skill: data.skill,
      rawScore: data.rawScore ?? null,
      bandScore: data.bandScore,
      notes: data.notes ?? null,
      duration: data.duration ?? null,
    };

    if (data.id) {
      tx.update(schema.practiceAttempts).set(values)
        .where(eq(schema.practiceAttempts.id, data.id)).run();
    } else {
      tx.insert(schema.practiceAttempts).values({ id: attemptId, ...values }).run();
    }

    const oldSetId = previous?.practiceSetId;
    const newSetId = values.practiceSetId;

    if (oldSetId && oldSetId !== newSetId) {
      const result = tx.select({ value: count() }).from(schema.practiceAttempts)
        .where(eq(schema.practiceAttempts.practiceSetId, oldSetId)).get();
      tx.update(schema.practiceSets).set({ status: statusAfterAttemptCount(result?.value ?? 0) })
        .where(eq(schema.practiceSets.id, oldSetId)).run();
    }

    if (newSetId) {
      const updated = tx.update(schema.practiceSets).set({ status: "Completed" })
        .where(eq(schema.practiceSets.id, newSetId)).returning({ id: schema.practiceSets.id }).get();
      if (!updated) throw new Error("Practice set not found");
    }
  });

  revalidateApplication();
  return { success: true, id: attemptId };
}

export async function deleteAttempt(input: unknown) {
  const id = idSchema.parse(input);
  db.transaction((tx) => {
    const attempt = tx.select().from(schema.practiceAttempts)
      .where(eq(schema.practiceAttempts.id, id)).get();
    if (!attempt) throw new Error("Practice attempt not found");

    tx.delete(schema.practiceAttempts).where(eq(schema.practiceAttempts.id, id)).run();
    if (attempt.practiceSetId) {
      const result = tx.select({ value: count() }).from(schema.practiceAttempts)
        .where(eq(schema.practiceAttempts.practiceSetId, attempt.practiceSetId)).get();
      tx.update(schema.practiceSets).set({ status: statusAfterAttemptCount(result?.value ?? 0) })
        .where(eq(schema.practiceSets.id, attempt.practiceSetId)).run();
    }
  });

  revalidateApplication();
  return { success: true };
}

export async function transitionPracticeSetStatus(idInput: unknown, eventInput: unknown) {
  const id = idSchema.parse(idInput);
  const event = practiceSetEventSchema.parse(eventInput);
  db.transaction((tx) => {
    const practiceSet = tx.select({ status: schema.practiceSets.status }).from(schema.practiceSets)
      .where(eq(schema.practiceSets.id, id)).get();
    if (!practiceSet) throw new Error("Practice set not found");
    const status = statusAfterPracticeSetEvent(practiceSet.status, event);
    tx.update(schema.practiceSets).set({ status }).where(eq(schema.practiceSets.id, id)).run();
  });
  revalidateApplication();
  return { success: true };
}

export async function updatePracticeSetDetails(idInput: unknown, input: unknown) {
  const id = idSchema.parse(idInput);
  const data = practiceSetDetailsInputSchema.parse(input);
  const updated = db.update(schema.practiceSets).set({ targetDate: data.targetDate })
    .where(eq(schema.practiceSets.id, id)).returning({ id: schema.practiceSets.id }).get();
  if (!updated) throw new Error("Practice set not found");
  revalidateApplication();
  return { success: true };
}

export async function createCustomPracticeSet(input: unknown) {
  const data = customPracticeSetInputSchema.parse(input);
  const setId = generateId();

  db.transaction((tx) => {
    const bookTitle = `Custom: ${data.bookName}`;
    const existingBook = tx.select().from(schema.cambridgeBooks)
      .where(and(eq(schema.cambridgeBooks.title, bookTitle), eq(schema.cambridgeBooks.isCustom, 1))).get();
    const bookId = existingBook?.id ?? tx.insert(schema.cambridgeBooks).values({
      number: 0,
      title: bookTitle,
      version: "Academic",
      isCustom: 1,
    }).returning({ id: schema.cambridgeBooks.id }).get().id;

    tx.insert(schema.practiceSets).values({
      id: setId,
      bookId,
      testNumber: data.testNumber,
      moduleSkill: data.moduleSkill,
      status: "To Practice",
      targetDate: data.targetDate ?? null,
      isCustom: 1,
    }).run();
  });

  revalidateApplication();
  return { success: true, id: setId };
}

export async function saveStudyGoals(input: unknown) {
  const goals = goalsInputSchema.parse(input);
  db.transaction((tx) => {
    tx.update(schema.studyGoals).set({ isActive: 0 })
      .where(eq(schema.studyGoals.isActive, 1)).run();
    tx.insert(schema.studyGoals).values({ id: generateId(), ...goals, isActive: 1 }).run();
  });
  revalidateApplication();
  return { success: true };
}

export async function updateAppSetting(keyInput: unknown, valueInput: unknown) {
  const key = z.literal("defaultTestType").parse(keyInput);
  const value = testTypeSchema.parse(valueInput);
  db.insert(schema.appSettings).values({ key, value }).onConflictDoUpdate({
    target: schema.appSettings.key,
    set: { value },
  }).run();
  revalidateApplication();
  return { success: true };
}

export async function exportData(): Promise<string> {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      books: db.select().from(schema.cambridgeBooks).all(),
      sets: db.select().from(schema.practiceSets).all(),
      attempts: db.select().from(schema.practiceAttempts).all(),
      goals: db.select().from(schema.studyGoals).all(),
      settings: db.select().from(schema.appSettings).all(),
    },
  }, null, 2);
}

export async function importData(jsonData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = backupPayloadSchema.parse(JSON.parse(jsonData));
    const { books, sets, attempts, goals, settings } = payload.data;
    db.transaction((tx) => {
      tx.delete(schema.practiceAttempts).run();
      tx.delete(schema.practiceSets).run();
      tx.delete(schema.cambridgeBooks).run();
      tx.delete(schema.studyGoals).run();
      tx.delete(schema.appSettings).run();
      if (books.length) tx.insert(schema.cambridgeBooks).values(books).run();
      if (sets.length) tx.insert(schema.practiceSets).values(sets).run();
      if (attempts.length) tx.insert(schema.practiceAttempts).values(attempts).run();
      if (goals.length) tx.insert(schema.studyGoals).values(goals).run();
      if (settings.length) tx.insert(schema.appSettings).values(settings).run();
    });
    revalidateApplication();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid backup file";
    return { success: false, error: message };
  }
}

export async function resetDatabase() {
  db.transaction((tx) => {
    tx.delete(schema.practiceAttempts).run();
    tx.delete(schema.practiceSets).run();
    tx.delete(schema.cambridgeBooks).run();
    tx.delete(schema.studyGoals).run();
    tx.delete(schema.appSettings).run();
    tx.insert(schema.studyGoals).values({
      ...DEFAULT_GOALS,
      id: generateId(),
    }).run();
    seedCambridgeCatalogue(tx);
  });
  revalidateApplication();
  return { success: true };
}
