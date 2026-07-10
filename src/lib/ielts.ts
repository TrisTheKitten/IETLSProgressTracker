/**
 * IELTS Scoring Logic and Conversion Utilities
 */

// Official IELTS rounding:
// Takes the average of the 4 skills and rounds to the nearest half-band.
// If the average ends in .25 or .75 or above, it is rounded UP to the nearest half band.
// e.g. 6.25 -> 6.5, 6.75 -> 7.0, 6.125 -> 6.0, 6.625 -> 6.5.
export function calculateOverallBand(scores: {
  reading?: number | null;
  listening?: number | null;
  writing?: number | null;
  speaking?: number | null;
}): number {
  const activeScores = [
    scores.reading,
    scores.listening,
    scores.writing,
    scores.speaking,
  ].filter((s): s is number => s !== undefined && s !== null);

  if (activeScores.length === 0) return 0;

  const average = activeScores.reduce((sum, val) => sum + val, 0) / activeScores.length;
  const wholePart = Math.floor(average);
  const decimalPart = average - wholePart;

  if (decimalPart < 0.25) {
    return wholePart;
  } else if (decimalPart < 0.75) {
    return wholePart + 0.5;
  } else {
    return wholePart + 1.0;
  }
}

// Convert Listening raw score (0-40) to band score (1.0-9.0)
export function rawToBandListening(raw: number): number {
  if (raw >= 39) return 9.0;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8.0;
  if (raw >= 32) return 7.5;
  if (raw >= 30) return 7.0;
  if (raw >= 26) return 6.5;
  if (raw >= 23) return 6.0;
  if (raw >= 18) return 5.5;
  if (raw >= 16) return 5.0;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4.0;
  if (raw >= 8) return 3.5;
  if (raw >= 6) return 3.0;
  if (raw >= 4) return 2.5;
  if (raw >= 3) return 2.0;
  if (raw >= 2) return 1.5;
  if (raw >= 1) return 1.0;
  return 0.0;
}

// Convert Reading Academic raw score (0-40) to band score (1.0-9.0)
export function rawToBandReadingAcademic(raw: number): number {
  if (raw >= 39) return 9.0;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8.0;
  if (raw >= 33) return 7.5;
  if (raw >= 30) return 7.0;
  if (raw >= 27) return 6.5;
  if (raw >= 23) return 6.0;
  if (raw >= 20) return 5.5;
  if (raw >= 15) return 5.0;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4.0;
  if (raw >= 6) return 3.5;
  if (raw >= 4) return 3.0;
  if (raw === 3) return 2.5;
  if (raw === 2) return 2.0;
  if (raw === 1) return 1.0;
  return 0.0;
}

// Convert Reading General Training raw score (0-40) to band score (1.0-9.0)
export function rawToBandReadingGeneral(raw: number): number {
  if (raw >= 40) return 9.0;
  if (raw >= 39) return 8.5;
  if (raw >= 37) return 8.0;
  if (raw >= 36) return 7.5;
  if (raw >= 34) return 7.0;
  if (raw >= 32) return 6.5;
  if (raw >= 30) return 6.0;
  if (raw >= 27) return 5.5;
  if (raw >= 23) return 5.0;
  if (raw >= 19) return 4.5;
  if (raw >= 15) return 4.0;
  if (raw >= 12) return 3.5;
  if (raw >= 9) return 3.0;
  if (raw >= 6) return 2.5;
  if (raw >= 3) return 2.0;
  if (raw === 2) return 1.5;
  if (raw === 1) return 1.0;
  return 0.0;
}

// Per-skill color tokens for consistent scannability across the app.
export const SKILL_COLORS: Record<
  "Listening" | "Reading" | "Writing" | "Speaking",
  { bg: string; text: string; border: string; dot: string; hex: string }
> = {
  Listening: { bg: "bg-secondary", text: "text-chart-2", border: "border-chart-2", dot: "bg-chart-2", hex: "var(--chart-2)" },
  Reading: { bg: "bg-secondary", text: "text-chart-3", border: "border-chart-3", dot: "bg-chart-3", hex: "var(--chart-3)" },
  Writing: { bg: "bg-secondary", text: "text-chart-4", border: "border-chart-4", dot: "bg-chart-4", hex: "var(--chart-4)" },
  Speaking: { bg: "bg-secondary", text: "text-chart-5", border: "border-chart-5", dot: "bg-chart-5", hex: "var(--chart-5)" },
};

export function skillColor(skill: string) {
  return SKILL_COLORS[skill as keyof typeof SKILL_COLORS] ?? SKILL_COLORS.Listening;
}

// Global converter wrapper
export function convertRawToBand(
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking',
  raw: number,
  testType: 'Academic' | 'General Training'
): number {
  // Bound check
  const clampedRaw = Math.max(0, Math.min(40, Math.round(raw)));

  if (skill === 'Listening') {
    return rawToBandListening(clampedRaw);
  }
  if (skill === 'Reading') {
    if (testType === 'Academic') {
      return rawToBandReadingAcademic(clampedRaw);
    } else {
      return rawToBandReadingGeneral(clampedRaw);
    }
  }
  // Writing and Speaking do not use raw score conversion
  return 0.0;
}

