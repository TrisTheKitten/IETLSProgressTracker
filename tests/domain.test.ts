import assert from "node:assert/strict";
import test from "node:test";
import { attemptInputSchema, backupPayloadSchema, DEFAULT_GOALS, goalTargetForSkill } from "../src/lib/domain";

test("attempt input preserves a zero raw score", () => {
  const attempt = attemptInputSchema.parse({
    skill: "Listening",
    date: "2026-07-10T05:00:00.000Z",
    rawScore: 0,
    bandScore: 0,
  });
  assert.equal(attempt.rawScore, 0);
  assert.equal(attempt.bandScore, 0);
});

test("attempt input rejects raw scores for productive skills", () => {
  assert.equal(attemptInputSchema.safeParse({
    skill: "Writing",
    date: "2026-07-10T05:00:00.000Z",
    rawScore: 20,
    bandScore: 6.5,
  }).success, false);
});

test("legacy custom-book backups are normalized at the import adapter", () => {
  const payload = backupPayloadSchema.parse({
    version: 1,
    data: {
      books: [{ id: 1, number: 99, title: "Custom: Tutor", version: "Academic" }],
      sets: [], attempts: [], goals: [], settings: [],
    },
  });
  assert.equal(payload.data.books[0].isCustom, 1);
});

test("goal targets use the canonical skill mapping", () => {
  assert.equal(goalTargetForSkill(DEFAULT_GOALS, "Writing"), 6.5);
});

