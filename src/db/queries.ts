import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DEFAULT_GOALS, testTypeSchema } from "@/lib/domain";

export function getActiveGoals() {
  return db.select().from(schema.studyGoals).where(eq(schema.studyGoals.isActive, 1)).get()
    ?? { ...DEFAULT_GOALS };
}

export function getAttemptsWithSetAndBook() {
  return db.select({ attempt: schema.practiceAttempts, set: schema.practiceSets, book: schema.cambridgeBooks })
    .from(schema.practiceAttempts)
    .leftJoin(schema.practiceSets, eq(schema.practiceAttempts.practiceSetId, schema.practiceSets.id))
    .leftJoin(schema.cambridgeBooks, eq(schema.practiceSets.bookId, schema.cambridgeBooks.id))
    .orderBy(desc(schema.practiceAttempts.date)).all();
}

export function getDefaultTestType() {
  const setting = db.select().from(schema.appSettings)
    .where(eq(schema.appSettings.key, "defaultTestType")).get();
  return testTypeSchema.catch("Academic").parse(setting?.value);
}
