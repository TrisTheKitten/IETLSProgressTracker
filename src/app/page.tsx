"use client";

import DashboardClient from "@/components/DashboardClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { calculateOverallBand } from "@/lib/ielts";
import { goalTargetForSkill, SKILLS, type Skill } from "@/lib/domain";
import {
  getActiveGoals,
  getAttemptsWithSetAndBook,
  getDefaultTestType,
  getSyllabusSetsForTestType,
  getUpcomingSetsForTestType,
} from "@/lib/local-store";
import { averageScoresBySkill, latestScoresBySkill } from "@/lib/stats";

export default function DashboardPage() {
  const { data } = useLocalStore();
  const goals = getActiveGoals(data);
  const defaultTestType = getDefaultTestType(data);
  const allAttemptsRaw = getAttemptsWithSetAndBook(data);

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

  const scoredAttempts = allAttemptsRaw.map(({ attempt }) => attempt);
  const latestScores = latestScoresBySkill(scoredAttempts);
  const averageScores = averageScoresBySkill(scoredAttempts);

  const overallBand = calculateOverallBand({
    listening: latestScores.Listening,
    reading: latestScores.Reading,
    writing: latestScores.Writing,
    speaking: latestScores.Speaking,
  });

  const syllabusSets = getSyllabusSetsForTestType(data, defaultTestType).map((row) => row.set);
  const completedSets = syllabusSets.filter((s) => s.status === "Completed");
  const completionRatio = `${completedSets.length}/${syllabusSets.length}`;
  const completionPct =
    syllabusSets.length > 0
      ? Math.round((completedSets.length / syllabusSets.length) * 100)
      : 0;

  const skillCompletedCounts: Record<Skill, number> = {
    Listening: 0,
    Reading: 0,
    Writing: 0,
    Speaking: 0,
  };
  for (const set of completedSets) {
    skillCompletedCounts[set.moduleSkill]++;
  }

  const skillsStats = SKILLS.map((skillName) => ({
    name: skillName,
    latest: latestScores[skillName] || 0,
    average: averageScores[skillName],
    target: goalTargetForSkill(goals, skillName),
    completedSets: skillCompletedCounts[skillName],
  }));

  const upcomingSets = getUpcomingSetsForTestType(data, defaultTestType).map((row) => ({
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
        overallBand,
        completionRatio,
        completionPct,
        skills: skillsStats,
      }}
      upcomingSets={upcomingSets}
      goals={goals}
    />
  );
}
