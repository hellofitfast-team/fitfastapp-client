/**
 * k6 Scenario: Ramp-Up Stress Test (100 → 1000 VUs)
 *
 * Linear ramp from 100 to 1000 VUs over 10 minutes.
 * Mixed actions: 80% dashboard reads, 20% check-in submits (AI stubbed).
 * Captures the VU threshold where error rate exceeds 0.5%.
 *
 * Run: k6 run e2e/load/scenarios/ramp-up.js
 */

import { sleep, check } from "k6";
import { Counter } from "k6/metrics";
import { convexQuery, convexMutation } from "../helpers/convex-client.js";
import { authenticateUsers, getVUEmail } from "../helpers/auth.js";
import { thresholds, guardAgainstProduction } from "../k6.config.js";

// Custom metric to track error count at each VU level
const errorCount = new Counter("errors_total");

export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { duration: "10m", target: 1000 }, // Linear ramp
        { duration: "1m", target: 0 }, // Ramp down
      ],
    },
  },
  thresholds,
};

export function setup() {
  guardAgainstProduction();
  // Pre-auth a pool of 100 users (VUs rotate through them)
  const tokens = authenticateUsers(100);
  return { tokens };
}

export default function (data) {
  const vuIndex = ((__VU - 1) % 100) + 1;
  const email = getVUEmail(vuIndex);
  const token = data.tokens[email];

  // 80% reads, 20% writes
  const isWrite = Math.random() < 0.2;

  if (isWrite) {
    // Check-in submit (AI stubbed)
    const result = convexMutation(
      "checkIns:submitCheckIn",
      {
        weight: 70 + Math.random() * 20,
        energyLevel: Math.floor(Math.random() * 5) + 1,
        sleepQuality: Math.floor(Math.random() * 5) + 1,
        stressLevel: Math.floor(Math.random() * 5) + 1,
        notes: `Ramp-up test VU ${__VU}`,
      },
      token,
    );

    if (result && result.error) {
      errorCount.add(1);
    }
  } else {
    // Dashboard read
    const result = convexQuery("dashboard:getDashboardData", {}, token);
    if (result && result.error) {
      errorCount.add(1);
    }

    sleep(0.3);

    // Meal plan read
    convexQuery("mealPlans:getCurrentMealPlan", {}, token);
  }

  // Variable think time
  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log(
    "Ramp-up test complete. Check k6 output for the VU threshold " +
      "where error rate exceeded 0.5%.",
  );
}
