/**
 * Client-side constants — single source of truth for magic numbers
 * used across the client PWA.
 *
 * NOTE: Some values are also defined in convex/constants.ts for the backend.
 * The two files cannot cross-import (Convex runtime vs Next.js client).
 * When changing a value here, check convex/constants.ts for its counterpart.
 */

// ── Upload Limits ──────────────────────────────────────────────────────────
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // also in convex/constants.ts
export const MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024);
export const MAX_CHECK_IN_PHOTOS = 4; // also in convex/constants.ts

// ── Pricing Plans ──────────────────────────────────────────────────────────
export const MAX_PRICING_PLANS = 4; // also in convex/constants.ts

// ── AI Generation ──────────────────────────────────────────────────────────
export const AI_MAX_OUTPUT_TOKENS = 6000;
export const AI_MAX_RETRIES = 3;
export const AI_DEFAULT_PLAN_DURATION_DAYS = 14; // must match convex/constants.ts DEFAULT_CHECK_IN_FREQUENCY_DAYS
export const AI_MODEL = "deepseek/deepseek-v3.2";
export const AI_REQUEST_TIMEOUT_MS = 30_000;

// ── Retry Configuration ────────────────────────────────────────────────────
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_INITIAL_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;
export const RETRY_MAX_DELAY_MS = 5000;

// ── Data Retention ─────────────────────────────────────────────────────────
export const DATA_RETENTION_DAYS = 90; // also in convex/constants.ts

// ── Check-in Defaults ──────────────────────────────────────────────────────
export const DEFAULT_CHECK_IN_FREQUENCY_DAYS = 14;
