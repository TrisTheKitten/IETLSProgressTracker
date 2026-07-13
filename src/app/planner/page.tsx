"use client";

import PlannerClient from "@/components/PlannerClient";
import { useLocalStore } from "@/components/LocalStoreProvider";
import {
  getActiveGoals,
  getPracticeSetsWithBooks,
  getStandardBooks,
} from "@/lib/local-store";
import { latestScoresBySkill } from "@/lib/stats";

export default function PlannerPage() {
  const { data } = useLocalStore();

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
    isCustom: row.set.isCustom === 1,
  }));

  const booksList = getStandardBooks(data);
  const targetOverall = getActiveGoals(data).targetOverall;
  const latestBySkill = latestScoresBySkill(
    [...data.attempts].sort((a, b) => b.date.localeCompare(a.date)),
  );
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
