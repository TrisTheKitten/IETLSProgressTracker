import { DEFAULT_GOALS, type TestType } from "@/lib/domain";
import type { AppData, AttemptWithSetAndBook, BookRecord, PracticeSetRecord } from "./types";

export function getActiveGoals(data: AppData) {
  return data.goals ?? { ...DEFAULT_GOALS };
}

export function getDefaultTestType(data: AppData): TestType {
  return data.settings.defaultTestType ?? "Academic";
}

export function getAttemptsWithSetAndBook(data: AppData): AttemptWithSetAndBook[] {
  const setsById = new Map(data.sets.map((set) => [set.id, set]));
  const booksById = new Map(data.books.map((book) => [book.id, book]));

  return [...data.attempts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((attempt) => {
      const set = attempt.practiceSetId ? setsById.get(attempt.practiceSetId) ?? null : null;
      const book = set?.bookId != null ? booksById.get(set.bookId) ?? null : null;
      return { attempt, set, book };
    });
}

export function getPracticeSetsWithBooks(data: AppData) {
  const booksById = new Map(data.books.map((book) => [book.id, book]));

  return data.sets
    .map((set) => {
      const book = set.bookId != null ? booksById.get(set.bookId) : undefined;
      if (!book) return null;
      return { set, book };
    })
    .filter((row): row is { set: PracticeSetRecord; book: BookRecord } => row != null)
    .sort((a, b) => {
      if (b.book.number !== a.book.number) return b.book.number - a.book.number;
      const testA = a.set.testNumber ?? 0;
      const testB = b.set.testNumber ?? 0;
      if (testA !== testB) return testA - testB;
      return a.set.moduleSkill.localeCompare(b.set.moduleSkill);
    });
}

export function getStandardBooks(data: AppData): BookRecord[] {
  return data.books
    .filter((book) => !book.isCustom)
    .sort((a, b) => b.number - a.number);
}

export function getSyllabusSetsForTestType(data: AppData, testType: TestType) {
  return getPracticeSetsWithBooks(data).filter(({ book }) => book.version === testType);
}

export function getUpcomingSetsForTestType(data: AppData, testType: TestType) {
  return getSyllabusSetsForTestType(data, testType)
    .filter(({ set }) => set.status === "To Practice" || set.status === "In Progress")
    .sort((a, b) => {
      const dateA = a.set.targetDate ?? "9999-99-99";
      const dateB = b.set.targetDate ?? "9999-99-99";
      return dateA.localeCompare(dateB);
    });
}
