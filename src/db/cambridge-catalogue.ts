import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/** First Cambridge volume recommended for current exam format (2016). */
export const CAMBRIDGE_BOOK_FIRST = 11;
/** Latest Cambridge volume as of July 2026. */
export const CAMBRIDGE_BOOK_LAST = 21;

export const CAMBRIDGE_VERSIONS = ['Academic', 'General Training'] as const;
export const CAMBRIDGE_SKILLS = ['Listening', 'Reading', 'Writing', 'Speaking'] as const;
export const CAMBRIDGE_TESTS_PER_BOOK = 4;

type DbOrTx = BetterSQLite3Database<typeof schema>;

function generateId(): string {
  return crypto.randomUUID();
}

function cambridgeBookTitle(bookNum: number, version: (typeof CAMBRIDGE_VERSIONS)[number]): string {
  const label = version === 'Academic' ? 'Academic' : 'General Training';
  return `Cambridge IELTS ${bookNum} (${label})`;
}

export function insertCambridgeBookWithSets(
  tx: DbOrTx,
  bookNum: number,
  version: (typeof CAMBRIDGE_VERSIONS)[number],
): number {
  const bookResult = tx
    .insert(schema.cambridgeBooks)
      .values({
        number: bookNum,
        title: cambridgeBookTitle(bookNum, version),
        version,
        isCustom: 0,
    })
    .returning({ id: schema.cambridgeBooks.id })
    .all();

  const bookId = bookResult[0].id;

  for (let testNum = 1; testNum <= CAMBRIDGE_TESTS_PER_BOOK; testNum++) {
    for (const skill of CAMBRIDGE_SKILLS) {
      tx.insert(schema.practiceSets)
        .values({
          id: generateId(),
          bookId,
          testNumber: testNum,
          moduleSkill: skill,
          status: 'Unstarted',
          isCustom: 0,
        })
        .run();
    }
  }

  return bookId;
}

export function seedCambridgeCatalogue(tx: DbOrTx): void {
  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      insertCambridgeBookWithSets(tx, bookNum, version);
    }
  }
}

/** Add any missing standard Cambridge books without touching existing rows. */
export function ensureCambridgeCatalogueUpToDate(
  tx: DbOrTx,
  existingBooks: { number: number; version: string; isCustom: number }[],
): number {
  const existing = new Set(
    existingBooks
      .filter((b) => b.isCustom === 0)
      .map((b) => `${b.number}-${b.version}`),
  );

  let added = 0;

  for (let bookNum = CAMBRIDGE_BOOK_FIRST; bookNum <= CAMBRIDGE_BOOK_LAST; bookNum++) {
    for (const version of CAMBRIDGE_VERSIONS) {
      if (!existing.has(`${bookNum}-${version}`)) {
        insertCambridgeBookWithSets(tx, bookNum, version);
        added++;
      }
    }
  }

  return added;
}
