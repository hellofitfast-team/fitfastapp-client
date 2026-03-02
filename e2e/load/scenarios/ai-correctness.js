/**
 * k6 Scenario: AI Correctness (3–5 VUs)
 *
 * Validates real AI plan generation at low concurrency.
 * 5 VUs, single iteration each. Verifies plans appear after check-in.
 * 60s timeout per plan generation (FR-008b, SC-004).
 *
 * Run: k6 run e2e/load/scenarios/ai-correctness.js
 */

import { sleep, check } from "k6";
import { convexMutation, convexQuery } from "../helpers/convex-client.js";
import { authenticateUsers, getVUEmail } from "../helpers/auth.js";
import { thresholds, guardAgainstProduction } from "../k6.config.js";

export const options = {
  scenarios: {
    ai_correctness: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 1, // Single iteration per VU
      maxDuration: "5m", // Allow plenty of time for AI
    },
  },
  thresholds: {
    ...thresholds,
    // Relax duration threshold for AI calls (they can be slow)
    http_req_duration: ["p(95)<60000"],
  },
};

export function setup() {
  guardAgainstProduction();
  const tokens = authenticateUsers(5);
  return { tokens };
}

export default function (data) {
  const vuIndex = __VU;
  const email = getVUEmail(vuIndex);
  const token = data.tokens[email];

  // Submit check-in with real AI (no stubbing)
  const checkInData = {
    weight: 70 + vuIndex * 2,
    bodyFatPercentage: 18 - vuIndex,
    energyLevel: 4,
    sleepQuality: 4,
    stressLevel: 2,
    adherence: {
      mealPlan: 4,
      workoutPlan: 4,
    },
    notes: `AI correctness test - VU ${vuIndex}`,
  };

  convexMutation("checkIns:submitCheckIn", checkInData, token);

  // Poll for plan generation (up to 60s)
  let mealPlanFound = false;
  let workoutPlanFound = false;
  const maxWait = 60;
  const pollInterval = 3;

  for (let elapsed = 0; elapsed < maxWait; elapsed += pollInterval) {
    sleep(pollInterval);

    if (!mealPlanFound) {
      const mealPlan = convexQuery("mealPlans:getCurrentMealPlan", {}, token);
      if (mealPlan && mealPlan.value) {
        mealPlanFound = true;
      }
    }

    if (!workoutPlanFound) {
      const workoutPlan = convexQuery("workoutPlans:getCurrentWorkoutPlan", {}, token);
      if (workoutPlan && workoutPlan.value) {
        workoutPlanFound = true;
      }
    }

    if (mealPlanFound && workoutPlanFound) break;
  }

  check(null, {
    "meal plan generated within 60s": () => mealPlanFound,
    "workout plan generated within 60s": () => workoutPlanFound,
  });
}
