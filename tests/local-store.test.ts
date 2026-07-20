import assert from "node:assert/strict";
import test from "node:test";
import {
  appDataFromBackup,
  backupFromAppData,
  coerceAppData,
  parseBackupJson,
} from "../src/lib/local-store/normalize";
import * as mutations from "../src/lib/local-store/mutations";
import { createInitialAppData } from "../src/lib/local-store/seed";
import type { BackupData } from "../src/lib/domain";

const legacyDoc: BackupData = {
  books: [
    { id: 1, number: 99, title: "Custom: Tutor", version: "Academic", isCustom: 1 },
    { id: 2, number: 11, title: "Cambridge IELTS 11 (Academic)", version: "Academic", isCustom: 0 },
  ],
  sets: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      bookId: 1,
      testNumber: 1,
      moduleSkill: "Listening",
      status: "To Practice",
      targetDate: null,
      isCustom: 1,
    },
  ],
  attempts: [],
  goals: [
    {
      id: "old",
      targetListening: 8,
      targetReading: 8,
      targetWriting: 7,
      targetSpeaking: 7,
      targetOverall: 7.5,
      isActive: 0,
    },
    {
      id: "active",
      targetListening: 7,
      targetReading: 7,
      targetWriting: 6.5,
      targetSpeaking: 6.5,
      targetOverall: 7,
      isActive: 1,
    },
  ],
  settings: [{ key: "defaultTestType", value: "General Training" }],
};

test("legacy documents coerce into the live AppData shape", () => {
  const live = coerceAppData(legacyDoc);
  assert.equal(live.books[0].isCustom, true);
  assert.equal(live.books[1].isCustom, false);
  assert.equal(live.sets[0].isCustom, true);
  assert.equal(live.goals.targetOverall, 7);
  assert.equal(live.settings.defaultTestType, "General Training");
  assert.equal(Array.isArray(live.goals), false);
});

test("backup round-trip preserves the live model", () => {
  const live = appDataFromBackup(legacyDoc);
  const again = appDataFromBackup(backupFromAppData(live));
  assert.deepEqual(again.goals, live.goals);
  assert.deepEqual(again.settings, live.settings);
  assert.equal(again.books[0].isCustom, true);
});

test("import parses v1 JSON backups", () => {
  const json = JSON.stringify({ version: 1, data: legacyDoc });
  const live = parseBackupJson(json);
  assert.equal(live.settings.defaultTestType, "General Training");
});

test("saveStudyGoals replaces the single goals object", () => {
  const initial = createInitialAppData();
  const next = mutations.saveStudyGoals(initial, {
    targetListening: 8,
    targetReading: 8,
    targetWriting: 7.5,
    targetSpeaking: 7.5,
    targetOverall: 8,
  });
  assert.equal(next.goals.targetOverall, 8);
  assert.equal(initial.goals.targetOverall, 7);
});

test("setDefaultTestType updates settings object", () => {
  const initial = createInitialAppData();
  const next = mutations.setDefaultTestType(initial, "General Training");
  assert.equal(next.settings.defaultTestType, "General Training");
});
