import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as path from 'path';
import * as fs from 'fs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import {
  ensureCambridgeCatalogueUpToDate,
  seedCambridgeCatalogue,
} from './cambridge-catalogue';
import { DEFAULT_GOALS } from '@/lib/domain';

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
const dbPath = isProductionBuild
  ? ':memory:'
  : process.env.DATABASE_URL || './data/ielts_tracker.db';

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Run migrations and seeding
export function initDb() {
  try {
    // Run migrations from drizzle folder
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    
    const books = db.select().from(schema.cambridgeBooks).all();
    if (books.length === 0) {
      seedDatabase();
    } else {
      db.transaction((tx) => {
        const added = ensureCambridgeCatalogueUpToDate(tx, books);
        if (added > 0) {
          console.log(`Added ${added} missing Cambridge IELTS book edition(s).`);
        }
      });
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

function seedDatabase() {
  console.log('Seeding initial Cambridge IELTS catalogue...');
  
  db.transaction((tx) => {
    // Seed study goals if empty
    const currentGoals = tx.select().from(schema.studyGoals).all();
    if (currentGoals.length === 0) {
      tx.insert(schema.studyGoals).values({
        ...DEFAULT_GOALS,
        id: crypto.randomUUID(),
      }).run();
    }

    seedCambridgeCatalogue(tx);
  });

  console.log('Database seeding completed successfully.');
}

// Build workers import server modules while collecting route metadata. Keep that
// evaluation isolated from the persistent database.
if (!isProductionBuild) {
  initDb();
}
