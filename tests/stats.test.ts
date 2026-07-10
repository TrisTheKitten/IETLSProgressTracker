import assert from "node:assert/strict";
import test from "node:test";
import { averageScoresBySkill, latestScoresBySkill } from "../src/lib/stats";

const attempts = [
  { skill: "Listening" as const, bandScore: 7.5 },
  { skill: "Reading" as const, bandScore: 7 },
  { skill: "Listening" as const, bandScore: 6.5 },
];

test("latest scores keep the first value from newest-first input", () => {
  assert.deepEqual(latestScoresBySkill(attempts), {
    Listening: 7.5, Reading: 7, Writing: null, Speaking: null,
  });
});

test("skill averages include empty skills as zero", () => {
  assert.deepEqual(averageScoresBySkill(attempts), {
    Listening: 7, Reading: 7, Writing: 0, Speaking: 0,
  });
});

