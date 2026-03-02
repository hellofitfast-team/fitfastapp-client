/**
 * k6 Scenario: Dashboard Reads (500–1000 VUs)
 *
 * Simulates concurrent users reading dashboard, meal plan, and workout plan
 * pages via Convex HTTP queries. Tests SC-004 thresholds.
 *
 * Ramp: 0→500 over 2min, hold 3min, 500→1000 over 2min, hold 3min, ramp down.
 *
 * Run: k6 run e2e/load/scenarios/dashboard-reads.js
 */

import { sleep } from "k6";
import { convexQuery } from "../helpers/convex-client.js";
import { authenticateUsers, getVUEmail } from "../helpers/auth.js";
import { thresholds, guardAgainstProduction } from "../k6.config.js";

export const options = {
  scenarios: {
    dashboard_reads: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 500 }, // Ramp to 500
        { duration: "3m", target: 500 }, // Hold at 500
        { duration: "2m", target: 1000 }, // Ramp to 1000
        { duration: "3m", target: 1000 }, // Hold at 1000
        { duration: "1m", target: 0 }, // Ramp down
      ],
    },
  },
  thresholds,
};

// Pre-authenticate users in the setup phase
export function setup() {
  guardAgainstProduction();

  // Authenticate a pool of users (k6 VUs will share these tokens)
  const tokens = authenticateUsers(100);
  return { tokens };
}

export default function (data) {
  // Each VU picks a token from the pool (round-robin)
  const vuIndex = ((__VU - 1) % 100) + 1;
  const email = getVUEmail(vuIndex);
  const token = data.tokens[email];

  // Simulate dashboard read pattern: 3 queries per iteration
  // 1. Dashboard data
  convexQuery("dashboard:getDashboardData", {}, token);

  sleep(0.5);

  // 2. Meal plan
  convexQuery("mealPlans:getCurrentMealPlan", {}, token);

  sleep(0.5);

  // 3. Workout plan
  convexQuery("workoutPlans:getCurrentWorkoutPlan", {}, token);

  // Think time between iterations (simulates user browsing)
  sleep(Math.random() * 2 + 1);
}
