# ADR 0002: Score Normalization and Rounding Rules

## Context & Problem Statement
IELTS overall band scores are calculated by averaging the individual scores of the four modules (Listening, Reading, Writing, Speaking). The final average must be normalized to standard IELTS band increments (integer bands or half bands, e.g. 6.0, 6.5, 7.0) using official IELTS rounding rules, which do not follow standard mathematical rounding.

## Decision
We implement a custom rounding utility function `calculateOverallBand` in `src/lib/ielts.ts` that enforces the official IELTS rounding specification.

## Rounding Specification
The overall score is rounded to the nearest half or whole band score:
- If the average fractional part is **less than 0.25**, it rounds **down** to the next whole band (e.g. `6.125` -> `6.0`).
- If the average fractional part is **0.25 or greater and less than 0.75**, it rounds to the **half-band** (e.g. `6.25` -> `6.5`, `6.625` -> `6.5`).
- If the average fractional part is **0.75 or greater**, it rounds **up** to the next whole band (e.g. `6.75` -> `7.0`).

## Raw Score Conversion
To improve user experience, we also implement the official raw mark (out of 40) mapping tables for:
- Listening (joint Academic/General)
- Reading (Academic)
- Reading (General Training)

When a raw mark is entered for Listening or Reading, the form automatically suggestions the corresponding band score.
