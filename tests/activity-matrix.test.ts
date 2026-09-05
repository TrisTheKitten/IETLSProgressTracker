import assert from "node:assert/strict";
import test from "node:test";
import {
  activityLevel,
  buildActivityMatrix,
  localDateKeyFromIso,
} from "../src/lib/activity-matrix";
import type { Skill } from "../src/lib/domain";

function isoAtLocalNoon(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0).toISOString();
}

function attempt(
  year: number,
  monthIndex: number,
  day: number,
  skill: Skill = "Listening",
) {
  return { date: isoAtLocalNoon(year, monthIndex, day), skill };
}

test("local date keys follow the calendar day, not the UTC date", () => {
  const noon = isoAtLocalNoon(2026, 8, 5);
  assert.equal(localDateKeyFromIso(noon), "2026-09-05");
});

test("activity levels map session counts onto a five-step scale", () => {
  assert.equal(activityLevel(0), 0);
  assert.equal(activityLevel(1), 1);
  assert.equal(activityLevel(2), 2);
  assert.equal(activityLevel(3), 3);
  assert.equal(activityLevel(4), 4);
  assert.equal(activityLevel(9), 4);
});

test("empty logs produce a Sunday-aligned year grid with zero streaks", () => {
  const now = new Date(2026, 8, 5, 18, 0, 0);
  const matrix = buildActivityMatrix([], now);

  assert.equal(matrix.weeks[0]?.days[0]?.weekday, 0);
  assert.equal(matrix.weeks.at(-1)?.days[0]?.dateKey, "2026-08-30");
  assert.ok(matrix.days.some((day) => day.dateKey === "2026-09-05"));
  assert.equal(matrix.totalSessions, 0);
  assert.equal(matrix.activeDays, 0);
  assert.equal(matrix.currentStreak, 0);
  assert.equal(matrix.longestStreak, 0);
  assert.ok(matrix.weeks.length >= 53);
  assert.ok(matrix.weeks.length <= 54);
});

test("sessions on the same local day stack into one cell", () => {
  const now = new Date(2026, 8, 5, 18, 0, 0);
  const matrix = buildActivityMatrix(
    [
      attempt(2026, 8, 5, "Listening"),
      attempt(2026, 8, 5, "Reading"),
      attempt(2026, 8, 5, "Writing"),
    ],
    now,
  );

  const day = matrix.days.find((cell) => cell.dateKey === "2026-09-05");
  assert.equal(day?.count, 3);
  assert.equal(day?.level, 3);
  assert.deepEqual(day?.skills, ["Listening", "Reading", "Writing"]);
  assert.equal(matrix.totalSessions, 3);
  assert.equal(matrix.activeDays, 1);
});

test("current streak counts consecutive days ending today, with a same-day grace", () => {
  const now = new Date(2026, 8, 5, 18, 0, 0);
  const withToday = buildActivityMatrix(
    [attempt(2026, 8, 3), attempt(2026, 8, 4), attempt(2026, 8, 5)],
    now,
  );
  assert.equal(withToday.currentStreak, 3);

  const withoutToday = buildActivityMatrix(
    [attempt(2026, 8, 3), attempt(2026, 8, 4)],
    now,
  );
  assert.equal(withoutToday.currentStreak, 2);

  const broken = buildActivityMatrix(
    [attempt(2026, 8, 3), attempt(2026, 8, 5)],
    now,
  );
  assert.equal(broken.currentStreak, 1);
});

test("longest streak uses the full history, not only the visible window", () => {
  const now = new Date(2026, 8, 5, 18, 0, 0);
  const matrix = buildActivityMatrix(
    [
      attempt(2024, 0, 1),
      attempt(2024, 0, 2),
      attempt(2024, 0, 3),
      attempt(2024, 0, 4),
      attempt(2026, 8, 5),
    ],
    now,
  );

  assert.equal(matrix.longestStreak, 4);
  assert.equal(matrix.currentStreak, 1);
  assert.equal(
    matrix.days.some((day) => day.dateKey === "2024-01-01"),
    false,
  );
});

test("future days in the current week stay empty and unmarked", () => {
  const now = new Date(2026, 8, 2, 18, 0, 0);
  const matrix = buildActivityMatrix([attempt(2026, 8, 3)], now);
  const tomorrow = matrix.days.find((day) => day.dateKey === "2026-09-03");

  assert.equal(tomorrow?.count, 0);
  assert.equal(tomorrow?.future, true);
  assert.equal(matrix.totalSessions, 0);
});
