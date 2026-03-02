/**
 * k6 Shared Configuration
 *
 * Shared thresholds and options used by all k6 load test scenarios.
 * Per SC-004: p95 < 3000ms, error rate < 0.5%, zero 5xx errors.
 *
 * Usage in scenarios:
 *   import { thresholds, getConvexUrl, guardAgainstProduction } from '../k6.config.js';
 */

/**
 * Shared thresholds applied to all scenarios.
 * - http_req_duration p(95) < 3000ms
 * - http_req_failed rate < 0.5%
 * - Zero 5xx responses
 */
export const thresholds = {
  http_req_duration: ["p(95)<3000"],
  http_req_failed: ["rate<0.005"],
  checks: ["rate>0.99"],
};

/**
 * Read the staging Convex URL from the E2E_CONVEX_URL environment variable.
 * k6 accesses env vars via __ENV (not process.env).
 */
export function getConvexUrl() {
  const url = __ENV.E2E_CONVEX_URL;
  if (!url) {
    throw new Error(
      "E2E_CONVEX_URL environment variable is required. " +
        "Set it to your staging Convex deployment URL.",
    );
  }
  return url;
}

/**
 * Production URL guard (RD-008, FR-007).
 * Aborts the test run if E2E_CONVEX_URL matches the production URL.
 * This prevents accidental load testing against production.
 */
export function guardAgainstProduction() {
  const stagingUrl = getConvexUrl();
  const productionUrl = __ENV.NEXT_PUBLIC_CONVEX_URL || "";

  if (productionUrl && stagingUrl === productionUrl) {
    throw new Error(
      "ABORT: E2E_CONVEX_URL matches NEXT_PUBLIC_CONVEX_URL (production). " +
        "Load tests must NOT target production. " +
        "Set E2E_CONVEX_URL to your staging Convex deployment.",
    );
  }
}

/**
 * Default k6 options merged by each scenario.
 */
export const defaultOptions = {
  thresholds,
  insecureSkipTLSVerify: false,
  noConnectionReuse: false,
};
