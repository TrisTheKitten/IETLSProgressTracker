import assert from "node:assert/strict";
import test from "node:test";
import {
  averageScoresBySkill,
  bandScoreDistribution,
  latestScoresBySkill,
} from "../src/lib/stats";

const attempts = [
  { skill: "Listening" as const, bandScore: 7.5 },
  { skill: "Reading" as const, bandScore: 7 },
  { skill: "Listening" as const, bandScore: 6.5 },
];

test("latest scores keep the first value from newest-first input", () => {
  assert.deepEqual(latestScoresBySkill(attempts), {
    Listening: 7.5,
    Reading: 7,
    Writing: null,
    Speaking: null,
  });
});

test("skill averages include empty skills as zero", () => {
  assert.deepEqual(averageScoresBySkill(attempts), {
    Listening: 7,
    Reading: 7,
    Writing: 0,
    Speaking: 0,
  });
});

test("band distribution is empty when no scores are logged", () => {
  assert.deepEqual(bandScoreDistribution([]), {
    counts: [],
    average: null,
    standardDeviation: null,
  });
});

test("band distribution counts each logged band from high to low", () => {
  assert.deepEqual(bandScoreDistribution([8, 9, 8, 9, 9, 7.5]).counts, [
    { band: 9, count: 3 },
    { band: 8, count: 2 },
    { band: 7.5, count: 1 },
  ]);
});

test("band distribution average is the unrounded mean of logged scores", () => {
  assert.equal(bandScoreDistribution([9, 8, 7]).average, 8);
  assert.equal(bandScoreDistribution([9, 9, 8]).average, 26 / 3);
});

test("band distribution uses sample standard deviation", () => {
  assert.equal(bandScoreDistribution([9, 8, 7]).standardDeviation, 1);
});

test("band distribution has no standard deviation for a single score", () => {
  assert.deepEqual(bandScoreDistribution([8.5]), {
    counts: [{ band: 8.5, count: 1 }],
    average: 8.5,
    standardDeviation: null,
  });
});
