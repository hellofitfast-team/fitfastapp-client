/**
 * k6 Convex HTTP Client Helper
 *
 * Wraps k6's http.post() to call Convex query/mutation HTTP endpoints.
 * Convex HTTP API: POST /api/query and POST /api/mutation with JSON bodies.
 *
 * Usage:
 *   import { convexQuery, convexMutation } from '../helpers/convex-client.js';
 *   const result = convexQuery('dashboard:getDashboardData', { userId });
 */

import http from "k6/http";
import { check } from "k6";

/**
 * Get the base Convex URL from environment.
 */
function getBaseUrl() {
  const url = __ENV.E2E_CONVEX_URL;
  if (!url) {
    throw new Error("E2E_CONVEX_URL is required");
  }
  // Remove trailing slash
  return url.replace(/\/$/, "");
}

/**
 * Build common headers for Convex HTTP requests.
 * @param {string} [token] - Optional auth token for authenticated requests.
 */
function buildHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Execute a Convex query via HTTP POST.
 *
 * @param {string} functionPath - Convex function path (e.g., 'dashboard:getDashboardData')
 * @param {object} [args={}] - Query arguments
 * @param {string} [token] - Auth token
 * @returns {object} Parsed JSON response
 */
export function convexQuery(functionPath, args, token) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/query`;
  const payload = JSON.stringify({
    path: functionPath,
    args: args || {},
    format: "json",
  });

  const res = http.post(url, payload, {
    headers: buildHeaders(token),
    tags: { type: "query", function: functionPath },
  });

  check(res, {
    [`query ${functionPath} status 200`]: (r) => r.status === 200,
    [`query ${functionPath} no 5xx`]: (r) => r.status < 500,
  });

  try {
    return JSON.parse(res.body);
  } catch {
    return { error: "Failed to parse response", status: res.status };
  }
}

/**
 * Execute a Convex mutation via HTTP POST.
 *
 * @param {string} functionPath - Convex function path (e.g., 'checkIns:submitCheckIn')
 * @param {object} [args={}] - Mutation arguments
 * @param {string} [token] - Auth token
 * @returns {object} Parsed JSON response
 */
export function convexMutation(functionPath, args, token) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/mutation`;
  const payload = JSON.stringify({
    path: functionPath,
    args: args || {},
    format: "json",
  });

  const res = http.post(url, payload, {
    headers: buildHeaders(token),
    tags: { type: "mutation", function: functionPath },
  });

  check(res, {
    [`mutation ${functionPath} status 200`]: (r) => r.status === 200,
    [`mutation ${functionPath} no 5xx`]: (r) => r.status < 500,
  });

  try {
    return JSON.parse(res.body);
  } catch {
    return { error: "Failed to parse response", status: res.status };
  }
}

/**
 * Execute a Convex action via HTTP POST.
 *
 * @param {string} functionPath - Convex action path
 * @param {object} [args={}] - Action arguments
 * @param {string} [token] - Auth token
 * @returns {object} Parsed JSON response
 */
export function convexAction(functionPath, args, token) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/action`;
  const payload = JSON.stringify({
    path: functionPath,
    args: args || {},
    format: "json",
  });

  const res = http.post(url, payload, {
    headers: buildHeaders(token),
    tags: { type: "action", function: functionPath },
  });

  check(res, {
    [`action ${functionPath} status 200`]: (r) => r.status === 200,
    [`action ${functionPath} no 5xx`]: (r) => r.status < 500,
  });

  try {
    return JSON.parse(res.body);
  } catch {
    return { error: "Failed to parse response", status: res.status };
  }
}
