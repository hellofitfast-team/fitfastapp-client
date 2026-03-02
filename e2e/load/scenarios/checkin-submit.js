/**
 * k6 Scenario: Check-In Submit — AI Stubbed (50 VUs)
 *
 * Simulates 50 concurrent users submitting check-ins with AI disabled.
 * Constant load for 3 minutes. Verifies no silent drops (SC-004).
 *
 * Run: k6 run e2e/load/scenarios/checkin-submit.js
 */

import { sleep, check } from "k6";
import { convexMutation, convexQuery } from "../helpers/convex-client.js";
import { authenticateUsers, getVUEmail } from "../helpers/auth.js";
import { thresholds, guardAgainstProduction } from "../k6.config.js";

export const options = {
  scenarios: {
    checkin_submit: {
      executor: "constant-vus",
      vus: 50,
      duration: "3m",
    },
  },
  thresholds,
};

export function setup() {
  guardAgainstProduction();
  const tokens = authenticateUsers(50);
  return { tokens };
}

/**
 * Generate realistic check-in data for submission.
 */
function generateCheckInData(vuNum) {
  return {
    weight: 70 + Math.random() * 20,
    bodyFatPercentage: 15 + Math.random() * 10,
    energyLevel: Math.floor(Math.random() * 5) + 1,
    sleepQuality: Math.floor(Math.random() * 5) + 1,
    stressLevel: Math.floor(Math.random() * 5) + 1,
    adherence: {
      mealPlan: Math.floor(Math.random() * 5) + 1,
      workoutPlan: Math.floor(Math.random() * 5) + 1,
    },
    notes: `Load test check-in from VU ${vuNum}`,
  };
}

export default function (data) {
  const vuIndex = ((__VU - 1) % 50) + 1;
  const email = getVUEmail(vuIndex);
  const token = data.tokens[email];

  // Submit check-in
  const checkInData = generateCheckInData(vuIndex);
  const result = convexMutation("checkIns:submitCheckIn", checkInData, token);

  check(result, {
    "check-in recorded (no silent drop)": (r) => r && !r.error,
  });

  // Think time between submissions
  sleep(Math.random() * 3 + 2);
}
