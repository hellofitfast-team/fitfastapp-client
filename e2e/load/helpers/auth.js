/**
 * k6 Auth Helper
 *
 * Authenticates test users against Convex Auth via the password flow.
 * Convex Auth uses @convex-dev/auth which exposes sign-in via HTTP action.
 *
 * For k6 load testing, we authenticate via the Convex HTTP API to get
 * session tokens. Each VU gets a unique test user (loaduser-001@test.com, etc.).
 *
 * Usage:
 *   import { authenticateUser, getVUEmail } from '../helpers/auth.js';
 *   const token = authenticateUser(getVUEmail(__VU));
 */

import http from "k6/http";
import { check, fail } from "k6";

/**
 * Generate a unique test email for a given VU number.
 * @param {number} vuNum - Virtual user number (1-based)
 * @returns {string} Email like "loaduser-001@test.com"
 */
export function getVUEmail(vuNum) {
  const padded = String(vuNum).padStart(3, "0");
  return `loaduser-${padded}@test.com`;
}

/**
 * Default password for all load test users.
 * Must match what was set in seed:createLoadTestUsers.
 */
const LOAD_TEST_PASSWORD = "loadtest12345";

/**
 * Authenticate a user via Convex Auth password sign-in.
 *
 * Convex Auth (@convex-dev/auth) exposes sign-in via a mutation.
 * We call the auth sign-in action via HTTP to get a session token.
 *
 * @param {string} email - User email
 * @param {string} [password] - User password (defaults to LOAD_TEST_PASSWORD)
 * @returns {string|null} Auth token or null on failure
 */
export function authenticateUser(email, password) {
  const baseUrl = (__ENV.E2E_CONVEX_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    fail("E2E_CONVEX_URL is required for authentication");
    return null;
  }

  const pwd = password || LOAD_TEST_PASSWORD;

  // Convex Auth uses the auth/signIn action endpoint
  const url = `${baseUrl}/api/action`;
  const payload = JSON.stringify({
    path: "auth:signIn",
    args: {
      provider: "password",
      params: {
        email: email,
        password: pwd,
        flow: "signIn",
      },
    },
    format: "json",
  });

  const res = http.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { type: "auth", name: "signIn" },
  });

  const ok = check(res, {
    "auth response 200": (r) => r.status === 200,
  });

  if (!ok) {
    console.warn(`Auth failed for ${email}: status=${res.status}, body=${res.body}`);
    return null;
  }

  try {
    const body = JSON.parse(res.body);
    // Convex Auth returns a token in the response
    return body.token || body.value?.token || null;
  } catch {
    console.warn(`Failed to parse auth response for ${email}`);
    return null;
  }
}

/**
 * Pre-authenticate multiple users and return a map of email → token.
 * Useful for setup() in k6 scenarios.
 *
 * @param {number} count - Number of users to authenticate
 * @returns {object} Map of email → token
 */
export function authenticateUsers(count) {
  const tokens = {};
  for (let i = 1; i <= count; i++) {
    const email = getVUEmail(i);
    const token = authenticateUser(email);
    if (token) {
      tokens[email] = token;
    }
  }
  return tokens;
}
