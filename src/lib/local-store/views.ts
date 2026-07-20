import { calculateOverallBand } from "@/lib/ielts";
import { goalTargetForSkill, SKILLS, type Skill } from "@/lib/domain";
import { averageScoresBySkill, latestScoresBySkill } from "@/lib/stats";
import {
  getActiveGoals,
  getAttemptsWithSetAndBook,
  getDefaultTestType,
  getPracticeSetsWithBooks,
  getStandardBooks,
  getSyllabusSetsForTestType,
  getUpcomingSetsForTestType,
} from "./queries";
import type { AppData } from "./types";

function formatChartDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getDashboardView(data: AppData) {
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
  const completedSets = syllabusSets.filter((set) => set.status === "Completed");
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

  return {
    recentAttempts,
    stats: {
      overallBand,
      completionRatio,
      completionPct,
      skills: skillsStats,
    },
    upcomingSets,
    goals,
  };
}

export function getPlannerView(data: AppData) {
  const practiceSets = getPracticeSetsWithBooks(data).map((row) => ({
    id: row.set.id,
    bookId: row.set.bookId,
    bookTitle: row.book.title,
    bookNumber: row.book.number,
    bookVersion: row.book.version,
    testNumber: row.set.testNumber || 0,
    moduleSkill: row.set.moduleSkill,
    status: row.set.status,
    targetDate: row.set.targetDate,
    isCustom: row.set.isCustom,
  }));

  const latestBySkill = latestScoresBySkill(
    [...data.attempts].sort((a, b) => b.date.localeCompare(a.date)),
  );

  return {
    practiceSets,
    booksList: getStandardBooks(data),
    targetOverall: getActiveGoals(data).targetOverall,
    currentScores: {
      listening: latestBySkill.Listening,
      reading: latestBySkill.Reading,
      writing: latestBySkill.Writing,
      speaking: latestBySkill.Speaking,
    },
  };
}

export function getSettingsView(data: AppData) {
  return {
    goals: getActiveGoals(data),
    defaultTestType: getDefaultTestType(data),
  };
}

type SetSummary = {
  setId: string;
  bookTitle: string;
  testNumber: number;
  skill: Skill;
  averageScore: number;
  attemptsCount: number;
};

function buildSetSummaries(
  rows: ReturnType<typeof getAttemptsWithSetAndBook>,
): SetSummary[] {
  const setScoreMap: Record<
    string,
    { sum: number; count: number; bookTitle: string; testNumber: number; skill: Skill }
  > = {};

  for (const row of rows) {
    if (!row.attempt.practiceSetId || !row.set || !row.book) continue;
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

  return Object.entries(setScoreMap).map(([setId, item]) => ({
    setId,
    bookTitle: item.bookTitle,
    testNumber: item.testNumber,
    skill: item.skill,
    averageScore: item.sum / item.count,
    attemptsCount: item.count,
  }));
}

export function getAnalyticsView(data: AppData) {
  const goals = getActiveGoals(data);
  const attemptsRaw = getAttemptsWithSetAndBook(data);

  const attempts = attemptsRaw.map((row) => ({
    id: row.attempt.id,
    skill: row.attempt.skill,
    date: row.attempt.date,
    bandScore: row.attempt.bandScore,
    rawScore: row.attempt.rawScore,
    bookTitle: row.book?.title || undefined,
    testNumber: row.set?.testNumber || undefined,
  }));

  const setSummaries = buildSetSummaries(attemptsRaw);
  const perSkillLimit = 3;

  const bestSetsBySkill = Object.fromEntries(
    SKILLS.map((skill) => {
      const sorted = setSummaries
        .filter((summary) => summary.skill === skill)
        .sort((a, b) => b.averageScore - a.averageScore);
      return [skill, sorted.slice(0, perSkillLimit)];
    }),
  ) as Record<Skill, SetSummary[]>;

  const worstSetsBySkill = Object.fromEntries(
    SKILLS.map((skill) => {
      const sorted = setSummaries
        .filter((summary) => summary.skill === skill)
        .sort((a, b) => a.averageScore - b.averageScore);
      return [skill, sorted.slice(0, perSkillLimit)];
    }),
  ) as Record<Skill, SetSummary[]>;

  const ascAttempts = [...attemptsRaw].sort((a, b) =>
    a.attempt.date.localeCompare(b.attempt.date),
  );
  const latestAsOf: Record<string, number> = {};
  const progressData: { index: number; dateStr: string; overall: number; fullDate: string }[] = [];
  let progressIndex = 0;

  for (const row of ascAttempts) {
    latestAsOf[row.attempt.skill] = row.attempt.bandScore;
    const present = SKILLS.filter((skill) => latestAsOf[skill] !== undefined);
    if (present.length === 4) {
      const overall = calculateOverallBand({
        listening: latestAsOf.Listening ?? null,
        reading: latestAsOf.Reading ?? null,
        writing: latestAsOf.Writing ?? null,
        speaking: latestAsOf.Speaking ?? null,
      });
      progressData.push({
        index: progressIndex++,
        dateStr: formatChartDate(row.attempt.date),
        fullDate: row.attempt.date,
        overall,
      });
    }
  }

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
    }),
  ) as Record<Skill, { index: number; dateStr: string; fullDate: string; band: number }[]>;

  return {
    attempts,
    goals,
    bestSetsBySkill,
    worstSetsBySkill,
    progressData,
    skillProgress,
  };
}

export function getSkillAnalyticsView(data: AppData, skill: Skill) {
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
      bookNumber: row.book?.number,
      testNumber: row.set?.testNumber || undefined,
    }));

  const skillProgress = ascAttempts.map((row, index) => ({
    index,
    dateStr: formatChartDate(row.attempt.date),
    fullDate: row.attempt.date,
    band: row.attempt.bandScore,
  }));

  const setSummaries = buildSetSummaries(skillAttemptsRaw);
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

  return {
    skill,
    attempts,
    goals,
    bestSets,
    worstSets,
    skillProgress,
    allAttempts,
  };
}
