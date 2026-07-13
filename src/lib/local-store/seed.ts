import { DEFAULT_GOALS, type Skill, type TestType } from "@/lib/domain";
import type { AppData, BookRecord, PracticeSetRecord } from "./types";

/** First Cambridge volume recommended for current exam format (2016). */
export const CAMBRIDGE_BOOK_FIRST = 11;
/** Latest Cambridge volume as of July 2026. */
export const CAMBRIDGE_BOOK_LAST = 21;

export const CAMBRIDGE_VERSIONS = ["Academic", "General Training"] as const satisfies readonly TestType[];
export const CAMBRIDGE_SKILLS = ["Listening", "Reading", "Writing", "Speaking"] as const satisfies readonly Skill[];
export const CAMBRIDGE_TESTS_PER_BOOK = 4;

function generateId(): string {
  return crypto.randomUUID();
}

function cambridgeBookTitle(bookNum: number, version: TestType): string {
  const label = version === "Academic" ? "Academic" : "General Training";
  return `Cambridge IELTS ${bookNum} (${label})`;
}

export function createCambridgeBookWithSets(
  nextBookId: number,
  bookNum: number,
  version: TestType,
): { book: BookRecord; sets: PracticeSetRecord[]; nextBookId: number } {
  const book: BookRecord = {
    id: nextBookId,
    number: bookNum,
    title: cambridgeBookTitle(bookNum, version),
    version,
    isCustom: 0,
  };

  const sets: PracticeSetRecord[] = [];
  for (let testNum = 1; testNum <= CAMBRIDGE_TESTS_PER_BOOK; testNum++) {
    for (const skill of CAMBRIDGE_SKILLS) {
      sets.push({
        id: generateId(),
        bookId: book.id,
        testNumber: testNum,
        moduleSkill: skill,
        status: "Unstarted",
        targetDate: null,
        isCustom: 0,
      });
    }
  }

  return { book, sets, nextBookId: nextBookId + 1 };
}

export function buildCambridgeCatalogue(startBookId = 1): {
  books: BookRecord[];
  sets: PracticeSetRecord[];
  nextBookId: number;
} {
  const books: BookRecord[] = [];
  const sets: PracticeSetRecord[] = [];
  let nextBookId = startBookId;

  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      const created = createCambridgeBookWithSets(nextBookId, bookNum, version);
      books.push(created.book);
      sets.push(...created.sets);
      nextBookId = created.nextBookId;
    }
  }

  return { books, sets, nextBookId };
}

/** Add any missing standard Cambridge books without touching existing rows. */
export function ensureCambridgeCatalogueUpToDate(data: AppData): AppData {
  const existing = new Set(
    data.books
      .filter((b) => b.isCustom === 0)
      .map((b) => `${b.number}-${b.version}`),
  );

  let nextBookId = data.books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
  const books = [...data.books];
  const sets = [...data.sets];

  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      if (!existing.has(`${bookNum}-${version}`)) {
        const created = createCambridgeBookWithSets(nextBookId, bookNum, version);
        books.push(created.book);
        sets.push(...created.sets);
        nextBookId = created.nextBookId;
      }
    }
  }

  if (books.length === data.books.length) return data;
  return { ...data, books, sets };
}

export function createInitialAppData(): AppData {
  const catalogue = buildCambridgeCatalogue(1);
  return {
    books: catalogue.books,
    sets: catalogue.sets,
    attempts: [],
    goals: [{ ...DEFAULT_GOALS, id: generateId() }],
    settings: [],
  };
}
