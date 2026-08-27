import { SKILLS, type Skill } from "@/lib/domain";

export interface ScoredAttempt {
  skill: Skill;
  bandScore: number;
}
export type ScoresBySkill = Record<Skill, number | null>;

export function latestScoresBySkill(
  attemptsNewestFirst: readonly ScoredAttempt[],
): ScoresBySkill {
  const latest: ScoresBySkill = {
    Listening: null,
    Reading: null,
    Writing: null,
    Speaking: null,
  };
  for (const attempt of attemptsNewestFirst) {
    if (latest[attempt.skill] === null)
      latest[attempt.skill] = attempt.bandScore;
  }
  return latest;
}

export function averageScoresBySkill(
  attempts: readonly ScoredAttempt[],
): Record<Skill, number> {
  const sums: Record<Skill, number> = {
    Listening: 0,
    Reading: 0,
    Writing: 0,
    Speaking: 0,
  };
  const counts: Record<Skill, number> = {
    Listening: 0,
    Reading: 0,
    Writing: 0,
    Speaking: 0,
  };
  for (const attempt of attempts) {
    sums[attempt.skill] += attempt.bandScore;
    counts[attempt.skill] += 1;
  }
  return Object.fromEntries(
    SKILLS.map((skill) => [
      skill,
      counts[skill] ? sums[skill] / counts[skill] : 0,
    ]),
  ) as Record<Skill, number>;
}

export interface BandScoreCount {
  band: number;
  count: number;
}

export interface BandScoreDistribution {
  counts: BandScoreCount[];
  average: number | null;
  standardDeviation: number | null;
}

/** Sample standard deviation of logged IELTS bands, grouped from high to low. */
export function bandScoreDistribution(
  bandScores: readonly number[],
): BandScoreDistribution {
  if (bandScores.length === 0) {
    return { counts: [], average: null, standardDeviation: null };
  }

  const tally = new Map<number, number>();
  let sum = 0;
  for (const band of bandScores) {
    tally.set(band, (tally.get(band) ?? 0) + 1);
    sum += band;
  }

  const counts = [...tally.entries()]
    .map(([band, count]) => ({ band, count }))
    .sort((a, b) => b.band - a.band);

  const n = bandScores.length;
  const average = sum / n;
  let standardDeviation: number | null = null;
  if (n >= 2) {
    const squaredDiffs = bandScores.reduce(
      (acc, band) => acc + (band - average) ** 2,
      0,
    );
    standardDeviation = Math.sqrt(squaredDiffs / (n - 1));
  }

  return { counts, average, standardDeviation };
}
