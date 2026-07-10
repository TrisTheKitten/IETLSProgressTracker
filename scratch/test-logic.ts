import { calculateOverallBand, convertRawToBand } from "../src/lib/ielts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ Passed: ${message}`);
}

function runTests() {
  console.log("Running IELTS logic unit tests...");

  // 1. Overall Band Rounding Rules Tests
  assert(
    calculateOverallBand({ reading: 6.0, listening: 6.0, writing: 6.0, speaking: 6.0 }) === 6.0,
    "All 6.0 -> 6.0"
  );
  assert(
    calculateOverallBand({ reading: 6.0, listening: 6.5, writing: 6.0, speaking: 6.0 }) === 6.0,
    "Average 6.125 -> rounds down to 6.0"
  );
  assert(
    calculateOverallBand({ reading: 6.0, listening: 6.5, writing: 6.5, speaking: 6.0 }) === 6.5,
    "Average 6.25 -> rounds up to 6.5"
  );
  assert(
    calculateOverallBand({ reading: 6.5, listening: 6.5, writing: 6.5, speaking: 7.0 }) === 6.5,
    "Average 6.625 -> rounds down to 6.5"
  );
  assert(
    calculateOverallBand({ reading: 6.5, listening: 6.5, writing: 7.0, speaking: 7.0 }) === 7.0,
    "Average 6.75 -> rounds up to 7.0"
  );
  assert(
    calculateOverallBand({ reading: 6.0, listening: 6.0, writing: null, speaking: null }) === 6.0,
    "Calculates average with omitted/null skills"
  );

  // 2. Raw Marks Conversion Tests
  // Listening
  assert(convertRawToBand("Listening", 39, "Academic") === 9.0, "Listening 39 -> 9.0");
  assert(convertRawToBand("Listening", 30, "Academic") === 7.0, "Listening 30 -> 7.0");
  assert(convertRawToBand("Listening", 23, "Academic") === 6.0, "Listening 23 -> 6.0");
  
  // Reading Academic
  assert(convertRawToBand("Reading", 30, "Academic") === 7.0, "Reading Acad 30 -> 7.0");
  assert(convertRawToBand("Reading", 23, "Academic") === 6.0, "Reading Acad 23 -> 6.0");

  // Reading General Training
  assert(convertRawToBand("Reading", 34, "General Training") === 7.0, "Reading GT 34 -> 7.0");
  assert(convertRawToBand("Reading", 30, "General Training") === 6.0, "Reading GT 30 -> 6.0");

  console.log("All unit tests passed successfully!");
}

runTests();
