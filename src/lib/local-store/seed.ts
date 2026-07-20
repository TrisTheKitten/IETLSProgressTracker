import { DEFAULT_GOALS, type Skill, type TestType } from "@/lib/domain";
import { generateId, nextBookId } from "./ids";
import type { AppData, BookRecord, PracticeSetRecord } from "./types";

/** First Cambridge volume recommended for current exam format (2016). */
export const CAMBRIDGE_BOOK_FIRST = 11;
/** Latest Cambridge volume as of July 2026. */
export const CAMBRIDGE_BOOK_LAST = 21;

export const CAMBRIDGE_VERSIONS = ["Academic", "General Training"] as const satisfies readonly TestType[];
export const CAMBRIDGE_SKILLS = ["Listening", "Reading", "Writing", "Speaking"] as const satisfies readonly Skill[];
export const CAMBRIDGE_TESTS_PER_BOOK = 4;

function cambridgeBookTitle(bookNum: number, version: TestType): string {
  const label = version === "Academic" ? "Academic" : "General Training";
  return `Cambridge IELTS ${bookNum} (${label})`;
}

export function createCambridgeBookWithSets(
  bookId: number,
  bookNum: number,
  version: TestType,
): { book: BookRecord; sets: PracticeSetRecord[] } {
  const book: BookRecord = {
    id: bookId,
    number: bookNum,
    title: cambridgeBookTitle(bookNum, version),
    version,
    isCustom: false,
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
        isCustom: false,
      });
    }
  }

  return { book, sets };
}

export function buildCambridgeCatalogue(startBookId = 1): {
  books: BookRecord[];
  sets: PracticeSetRecord[];
} {
  const books: BookRecord[] = [];
  const sets: PracticeSetRecord[] = [];
  let bookId = startBookId;

  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      const created = createCambridgeBookWithSets(bookId, bookNum, version);
      books.push(created.book);
      sets.push(...created.sets);
      bookId += 1;
    }
  }

  return { books, sets };
}

/** Add any missing standard Cambridge books without touching existing rows. */
export function ensureCambridgeCatalogueUpToDate(data: AppData): AppData {
  const existing = new Set(
    data.books
      .filter((book) => !book.isCustom)
      .map((book) => `${book.number}-${book.version}`),
  );

  let bookId = nextBookId(data.books);
  const books = [...data.books];
  const sets = [...data.sets];

  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      if (!existing.has(`${bookNum}-${version}`)) {
        const created = createCambridgeBookWithSets(bookId, bookNum, version);
        books.push(created.book);
        sets.push(...created.sets);
        bookId += 1;
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
    goals: { ...DEFAULT_GOALS },
    settings: {},
  };
}
