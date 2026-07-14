"use client";

import { notFound, useParams } from "next/navigation";
import SkillAnalyticsClient from "@/components/SkillAnalyticsClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import { SKILLS, type Skill } from "@/lib/domain";
import { getActiveGoals, getAttemptsWithSetAndBook } from "@/lib/local-store";

function formatChartDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function resolveSkill(slug: string): Skill | null {
  const normalized = slug.toLowerCase();
  return SKILLS.find((s) => s.toLowerCase() === normalized) ?? null;
}

export default function SkillAnalyticsPage() {
  const params = useParams();
  const { data } = useLocalStore();
  const slug = typeof params.skill === "string" ? params.skill : "";
  const skill = resolveSkill(slug);

  if (!skill) {
    notFound();
  }

  const goals = getActiveGoals(data);
  const attemptsRaw = getAttemptsWithSetAndBook(data);

  const skillAttemptsRaw = attemptsRaw.filter((row) => row.attempt.skill === skill);
  const ascAttempts = [...skillAttemptsRaw].sort((a, b) =>
    a.attempt.date.localeCompare(b.attempt.date),
  );

  const attempts = [...skillAttemptsRaw]
    .sort((a, b) => b.attempt.date.localeCompare(a.attempt.date))
    .map((row) => ({
      id: row.attempt.id,
      skill: row.attempt.skill,
      date: row.attempt.date,
      bandScore: row.attempt.bandScore,
      rawScore: row.attempt.rawScore,
      notes: row.attempt.notes,
      duration: row.attempt.duration,
      practiceSetId: row.attempt.practiceSetId,
      bookTitle: row.book?.title || undefined,
      testNumber: row.set?.testNumber || undefined,
    }));

  const skillProgress = ascAttempts.map((row, index) => ({
    index,
    dateStr: formatChartDate(row.attempt.date),
    fullDate: row.attempt.date,
    band: row.attempt.bandScore,
  }));

  const setScoreMap: Record<
    string,
    { sum: number; count: number; bookTitle: string; testNumber: number; skill: Skill }
  > = {};

  skillAttemptsRaw.forEach((row) => {
    if (row.attempt.practiceSetId && row.set && row.book) {
      const setId = row.attempt.practiceSetId;
      if (!setScoreMap[setId]) {
        setScoreMap[setId] = {
          sum: 0,
          count: 0,
          bookTitle: row.book.title,
          testNumber: row.set.testNumber || 0,
          skill: row.set.moduleSkill,
        };
      }
      setScoreMap[setId].sum += row.attempt.bandScore;
      setScoreMap[setId].count++;
    }
  });

  const setSummaries = Object.entries(setScoreMap).map(([setId, item]) => ({
    setId,
    bookTitle: item.bookTitle,
    testNumber: item.testNumber,
    skill: item.skill,
    averageScore: item.sum / item.count,
    attemptsCount: item.count,
  }));

  const perSkillLimit = 3;
  const bestSets = [...setSummaries]
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, perSkillLimit);
  const worstSets = [...setSummaries]
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, perSkillLimit);

  const allAttempts = attemptsRaw.map((row) => ({
    skill: row.attempt.skill,
    date: row.attempt.date,
    bandScore: row.attempt.bandScore,
  }));

  return (
    <SkillAnalyticsClient
      skill={skill}
      attempts={attempts}
      goals={goals}
      bestSets={bestSets}
      worstSets={worstSets}
      skillProgress={skillProgress}
      allAttempts={allAttempts}
    />
  );
}
