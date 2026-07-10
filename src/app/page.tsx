import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc, or, and } from "drizzle-orm";
import DashboardClient from "@/components/DashboardClient";
import { calculateOverallBand } from "@/lib/ielts";
import { getActiveGoals, getAttemptsWithSetAndBook, getDefaultTestType } from "@/db/queries";
import { goalTargetForSkill, SKILLS, type Skill } from "@/lib/domain";
import { averageScoresBySkill, latestScoresBySkill } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const goals = getActiveGoals();
  const defaultTestType = getDefaultTestType();

  // 2. Fetch Attempts with sets & books
  const allAttemptsRaw = getAttemptsWithSetAndBook();

  // Map to dashboard structure
  const recentAttempts = allAttemptsRaw.map((row) => ({
    id: row.attempt.id,
    skill: row.attempt.skill,
    date: row.attempt.date,
    bandScore: row.attempt.bandScore,
    rawScore: row.attempt.rawScore,
    duration: row.attempt.duration,
    notes: row.attempt.notes,
    practiceSetId: row.attempt.practiceSetId,
    bookTitle: row.book?.title || undefined,
    testNumber: row.set?.testNumber || undefined,
  }));

  // 3. Compute Stats
  const scoredAttempts = allAttemptsRaw.map(({ attempt }) => attempt);
  const latestScores = latestScoresBySkill(scoredAttempts);
  const averageScores = averageScoresBySkill(scoredAttempts);

  const overallBand = calculateOverallBand({
    listening: latestScores.Listening,
    reading: latestScores.Reading,
    writing: latestScores.Writing,
    speaking: latestScores.Speaking,
  });

  // Completion counts — only sets for the user's chosen exam stream (Academic or General Training)
  const syllabusSetsRaw = await db.select({
    set: schema.practiceSets,
    book: schema.cambridgeBooks,
  })
    .from(schema.practiceSets)
    .innerJoin(schema.cambridgeBooks, eq(schema.practiceSets.bookId, schema.cambridgeBooks.id))
    .where(eq(schema.cambridgeBooks.version, defaultTestType))
    .all();

  const syllabusSets = syllabusSetsRaw.map((row) => row.set);
  const completedSets = syllabusSets.filter((s) => s.status === "Completed");
  const completionRatio = `${completedSets.length}/${syllabusSets.length}`;
  const completionPct =
    syllabusSets.length > 0
      ? Math.round((completedSets.length / syllabusSets.length) * 100)
      : 0;

  const skillCompletedCounts: Record<Skill, number> = { Listening: 0, Reading: 0, Writing: 0, Speaking: 0 };
  for (const set of completedSets) {
    skillCompletedCounts[set.moduleSkill]++;
  }

  const skillsStats = SKILLS.map((skillName) => {
    return {
      name: skillName,
      latest: latestScores[skillName] || 0,
      average: averageScores[skillName],
      target: goalTargetForSkill(goals, skillName),
      completedSets: skillCompletedCounts[skillName],
    };
  });

  // 4. Fetch Planned Checklist Tasks
  const upcomingSetsRaw = await db.select({
    set: schema.practiceSets,
    book: schema.cambridgeBooks,
  })
    .from(schema.practiceSets)
    .innerJoin(schema.cambridgeBooks, eq(schema.practiceSets.bookId, schema.cambridgeBooks.id))
    .where(
      and(
        or(
          eq(schema.practiceSets.status, "To Practice"),
          eq(schema.practiceSets.status, "In Progress")
        ),
        eq(schema.cambridgeBooks.version, defaultTestType)
      )
    )
    .orderBy(
      asc(schema.practiceSets.targetDate)
    )
    .limit(5)
    .all();

  const upcomingSets = upcomingSetsRaw.map((row) => ({
    id: row.set.id,
    moduleSkill: row.set.moduleSkill,
    bookTitle: row.book.title,
    testNumber: row.set.testNumber || 0,
    targetDate: row.set.targetDate,
  }));

  return (
    <DashboardClient
      recentAttempts={recentAttempts}
      stats={{
        overallBand: overallBand,
        completionRatio: completionRatio,
        completionPct: completionPct,
        skills: skillsStats,
      }}
      upcomingSets={upcomingSets}
      goals={goals}
    />
  );
}
