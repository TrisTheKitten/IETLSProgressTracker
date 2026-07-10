import assert from "node:assert/strict";
import test from "node:test";
import { statusAfterAttemptCount, statusAfterPracticeSetEvent } from "../src/lib/practice-set-lifecycle";

test("practice-set events have one transition policy", () => {
  assert.equal(statusAfterPracticeSetEvent("Unstarted", "plan"), "To Practice");
  assert.equal(statusAfterPracticeSetEvent("To Practice", "start"), "In Progress");
  assert.equal(statusAfterPracticeSetEvent("In Progress", "unplan"), "Unstarted");
});

test("manual events cannot erase completion", () => {
  assert.equal(statusAfterPracticeSetEvent("Completed", "unplan"), "Completed");
});

test("attempt count determines attempt-owned status", () => {
  assert.equal(statusAfterAttemptCount(1), "Completed");
  assert.equal(statusAfterAttemptCount(0), "To Practice");
});

