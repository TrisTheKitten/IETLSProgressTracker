import type { PracticeSetEvent, PracticeSetStatus } from "@/lib/domain";

export function statusAfterPracticeSetEvent(current: PracticeSetStatus, event: PracticeSetEvent): PracticeSetStatus {
  if (current === "Completed") return current;
  if (event === "plan") return "To Practice";
  if (event === "unplan") return "Unstarted";
  return "In Progress";
}

export function statusAfterAttemptCount(attemptCount: number): PracticeSetStatus {
  return attemptCount > 0 ? "Completed" : "To Practice";
}

