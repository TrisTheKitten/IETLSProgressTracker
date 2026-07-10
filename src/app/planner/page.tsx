import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import PlannerClient from "@/components/PlannerClient";
import { getActiveGoals } from "@/db/queries";
import { latestScoresBySkill } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  // Fetch all practice sets joined with book details
  const setsRaw = await db.select({
    set: schema.practiceSets,
    book: schema.cambridgeBooks,
  })
    .from(schema.practiceSets)
    .innerJoin(schema.cambridgeBooks, eq(schema.practiceSets.bookId, schema.cambridgeBooks.id))
    .orderBy(
      desc(schema.cambridgeBooks.number), 
      asc(schema.practiceSets.testNumber),
      asc(schema.practiceSets.moduleSkill)
    )
    .all();

  const practiceSets = setsRaw.map((row) => ({
    id: row.set.id,
    bookId: row.set.bookId,
    bookTitle: row.book.title,
    bookNumber: row.book.number,
    bookVersion: row.book.version,
    testNumber: row.set.testNumber || 0,
    moduleSkill: row.set.moduleSkill,
    status: row.set.status,
    targetDate: row.set.targetDate,
    isCustom: row.set.isCustom === 1,
  }));

  // Fetch list of standard books (exclude custom books)
  const booksListRaw = await db.select()
    .from(schema.cambridgeBooks)
    .orderBy(desc(schema.cambridgeBooks.number))
    .all();
    
  const booksList = booksListRaw.filter((book) => book.isCustom === 0);

  // Active study goal (for target overall)
  const targetOverall = getActiveGoals().targetOverall;

  // Latest band per skill (for the live projected-overall preview in the score dialog)
  const attemptsRaw = await db.select()
    .from(schema.practiceAttempts)
    .orderBy(desc(schema.practiceAttempts.date))
    .all();

  const latestBySkill = latestScoresBySkill(attemptsRaw);
  const currentScores = {
    listening: latestBySkill.Listening,
    reading: latestBySkill.Reading,
    writing: latestBySkill.Writing,
    speaking: latestBySkill.Speaking,
  };

  return (
    <PlannerClient 
      practiceSets={practiceSets} 
      booksList={booksList} 
      currentScores={currentScores}
      targetOverall={targetOverall}
    />
  );
}
