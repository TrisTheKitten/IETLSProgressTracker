import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { PRACTICE_SET_STATUSES, SKILLS, TEST_TYPES } from '@/lib/domain';

export const cambridgeBooks = sqliteTable('cambridge_books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  version: text('version', { enum: TEST_TYPES }).notNull(),
  isCustom: integer('is_custom').notNull().default(0),
});

export const practiceSets = sqliteTable('practice_sets', {
  id: text('id').primaryKey(),
  bookId: integer('book_id').references(() => cambridgeBooks.id, { onDelete: 'cascade' }),
  testNumber: integer('test_number'), // 1, 2, 3, 4
  moduleSkill: text('module_skill', { enum: SKILLS }).notNull(),
  status: text('status', { enum: PRACTICE_SET_STATUSES }).notNull().default('Unstarted'),
  targetDate: text('target_date'), // ISO date string
  isCustom: integer('is_custom').notNull().default(0), // 0 = False, 1 = True
});

export const practiceAttempts = sqliteTable('practice_attempts', {
  id: text('id').primaryKey(),
  practiceSetId: text('practice_set_id').references(() => practiceSets.id, { onDelete: 'set null' }),
  date: text('date').notNull(), // ISO datetime string
  skill: text('skill', { enum: SKILLS }).notNull(),
  rawScore: integer('raw_score'), // 0 - 40 (only applicable to Reading / Listening)
  bandScore: real('band_score').notNull(), // 0.0 - 9.0 (0.5 increments)
  notes: text('notes'),
  duration: integer('duration'), // duration in minutes
});

export const studyGoals = sqliteTable('study_goals', {
  id: text('id').primaryKey(),
  targetListening: real('target_listening').notNull().default(6.5),
  targetReading: real('target_reading').notNull().default(6.5),
  targetWriting: real('target_writing').notNull().default(6.5),
  targetSpeaking: real('target_speaking').notNull().default(6.5),
  targetOverall: real('target_overall').notNull().default(6.5),
  isActive: integer('is_active').notNull().default(1), // 1 = True, 0 = False
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
