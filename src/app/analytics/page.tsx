import AnalyticsClient from "@/components/AnalyticsClient";
import { calculateOverallBand } from "@/lib/ielts";
import { getActiveGoals, getAttemptsWithSetAndBook } from "@/db/queries";
import { SKILLS, type Skill } from "@/lib/domain";

export const dynamic = "force-dynamic";

function formatChartDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const goals = getActiveGoals();
  const attemptsRaw = getAttemptsWithSetAndBook();

  const attempts = attemptsRaw.map((row) => ({
    id: row.attempt.id,
    skill: row.attempt.skill,
    date: row.attempt.date,
    bandScore: row.attempt.bandScore,
    rawScore: row.attempt.rawScore,
    bookTitle: row.book?.title || undefined,
    testNumber: row.set?.testNumber || undefined,
  }));

  const setScoreMap: Record<
    string,
    { sum: number; count: number; bookTitle: string; testNumber: number; skill: Skill }
  > = {};

  attemptsRaw.forEach((row) => {
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

  const bestSetsBySkill = Object.fromEntries(
    SKILLS.map((skill) => {
      const sorted = setSummaries
        .filter((s) => s.skill === skill)
        .sort((a, b) => b.averageScore - a.averageScore);
      return [skill, sorted.slice(0, perSkillLimit)];
    })
  ) as Record<Skill, typeof setSummaries>;

  const worstSetsBySkill = Object.fromEntries(
    SKILLS.map((skill) => {
      const sorted = setSummaries
        .filter((s) => s.skill === skill)
        .sort((a, b) => a.averageScore - b.averageScore);
      return [skill, sorted.slice(0, perSkillLimit)];
    })
  ) as Record<Skill, typeof setSummaries>;

  // Overall band timeline — only once all four skills have a score.
  const ascAttempts = [...attemptsRaw].sort((a, b) => a.attempt.date.localeCompare(b.attempt.date));
  const latestAsOf: Record<string, number> = {};
  const progressData: { index: number; dateStr: string; overall: number; fullDate: string }[] = [];
  let progressIndex = 0;

  for (const row of ascAttempts) {
    latestAsOf[row.attempt.skill] = row.attempt.bandScore;
    const present = SKILLS.filter((s) => latestAsOf[s] !== undefined);
    if (present.length === 4) {
      const overall = calculateOverallBand({
        listening: latestAsOf["Listening"] ?? null,
        reading: latestAsOf["Reading"] ?? null,
        writing: latestAsOf["Writing"] ?? null,
        speaking: latestAsOf["Speaking"] ?? null,
      });
      progressData.push({
        index: progressIndex++,
        dateStr: formatChartDate(row.attempt.date),
        fullDate: row.attempt.date,
        overall,
      });
    }
  }

  // Per-skill score timelines for sparklines / skill cards.
  const skillProgress = Object.fromEntries(
    SKILLS.map((skill) => {
      const points = ascAttempts
        .filter((row) => row.attempt.skill === skill)
        .map((row, index) => ({
          index,
          dateStr: formatChartDate(row.attempt.date),
          fullDate: row.attempt.date,
          band: row.attempt.bandScore,
        }));
      return [skill, points];
    })
  ) as Record<Skill, { index: number; dateStr: string; fullDate: string; band: number }[]>;

  return (
    <AnalyticsClient
      attempts={attempts}
      goals={goals}
      bestSetsBySkill={bestSetsBySkill}
      worstSetsBySkill={worstSetsBySkill}
      progressData={progressData}
      skillProgress={skillProgress}
    />
  );
}
