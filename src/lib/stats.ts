import { SKILLS, type Skill } from "@/lib/domain";

export interface ScoredAttempt { skill: Skill; bandScore: number }
export type ScoresBySkill = Record<Skill, number | null>;

export function latestScoresBySkill(attemptsNewestFirst: readonly ScoredAttempt[]): ScoresBySkill {
  const latest: ScoresBySkill = { Listening: null, Reading: null, Writing: null, Speaking: null };
  for (const attempt of attemptsNewestFirst) {
    if (latest[attempt.skill] === null) latest[attempt.skill] = attempt.bandScore;
  }
  return latest;
}

export function averageScoresBySkill(attempts: readonly ScoredAttempt[]): Record<Skill, number> {
  const sums: Record<Skill, number> = { Listening: 0, Reading: 0, Writing: 0, Speaking: 0 };
  const counts: Record<Skill, number> = { Listening: 0, Reading: 0, Writing: 0, Speaking: 0 };
  for (const attempt of attempts) {
    sums[attempt.skill] += attempt.bandScore;
    counts[attempt.skill] += 1;
  }
  return Object.fromEntries(SKILLS.map((skill) => [skill, counts[skill] ? sums[skill] / counts[skill] : 0])) as Record<Skill, number>;
}

