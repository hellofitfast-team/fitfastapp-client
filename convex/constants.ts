/**
 * Shared backend constants — single source of truth for magic numbers
 * used across Convex functions.
 *
 * Import from here instead of hardcoding values in individual files.
 */

// ── Check-in & Scheduling ──────────────────────────────────────────────────
export const DEFAULT_CHECK_IN_FREQUENCY_DAYS = 10;

// ── Plan Durations ────────────────────────────────────────────────────────
export const DEFAULT_MEAL_PLAN_DURATION_DAYS = 10;
export const DEFAULT_WORKOUT_PLAN_DURATION_DAYS = 30;
export const MIN_PLAN_DURATION_DAYS = 1;
export const MAX_PLAN_DURATION_DAYS = 30;

// ── Data Retention ─────────────────────────────────────────────────────────
export const DATA_RETENTION_DAYS = 90;

// ── AI Workpool ────────────────────────────────────────────────────────────
export const MAX_AI_CONCURRENCY = 10;

// ── RAG Chunking ───────────────────────────────────────────────────────────
export const RAG_CHUNK_SIZE_WORDS = 500;
export const RAG_CHUNK_OVERLAP_WORDS = 50;

// ── Caching (ActionCache TTLs) ─────────────────────────────────────────────
export const FAQ_CACHE_TTL_MS = 3_600_000; // 1 hour
export const PRICING_CACHE_TTL_MS = 1_800_000; // 30 min
export const FOOD_REF_CACHE_TTL_MS = 3_600_000; // 1 hour

// ── Notifications (ActionRetrier) ──────────────────────────────────────────
export const NOTIFICATION_MAX_RETRIES = 5;
export const NOTIFICATION_INITIAL_BACKOFF_MS = 2000;
export const NOTIFICATION_BACKOFF_BASE = 2;

// ── Upload Limits ──────────────────────────────────────────────────────────
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_CHECK_IN_PHOTOS = 4;

// ── Pricing Plans ──────────────────────────────────────────────────────────
export const MAX_PRICING_PLANS = 4;

// ── Nutrition Engine ───────────────────────────────────────────────────────
export const NUTRITION = {
  /** Calorie multipliers by goal */
  goalMultipliers: {
    deficit: 0.8, // weight loss — 20% deficit
    surplus: 1.1, // muscle gain — 10% surplus
    maintenance: 1.0,
  },
  /** Protein targets per kg body weight (ISSN guidelines) */
  proteinPerKg: {
    cutting: 2.0,
    bulking: 1.8,
    general: 1.6,
  },
  /** Fat per kg body weight (middle of 0.8-1.0 range) */
  fatPerKg: 0.9,
  /** Minimum carbs in grams */
  minCarbsG: 50,
  /** Minimum calories by gender */
  minCalories: {
    male: 1500,
    female: 1200,
  },
  /** Exercise bonus per training day added to activity multiplier */
  exerciseBonusPerDay: 0.05,
  /** Cap on blended activity multiplier */
  maxActivityMultiplier: 1.9,
} as const;

// ── AI Generation ─────────────────────────────────────────────────────────
export const MEAL_OUTPUT_TOKENS_EN = 16000;
export const MEAL_OUTPUT_TOKENS_AR = 22000;
export const WORKOUT_OUTPUT_TOKENS_EN = 16000;
export const WORKOUT_OUTPUT_TOKENS_AR = 20000;
export const PLAN_GENERATION_TIMEOUT_MS = 240_000; // 4 minutes (2 min per model attempt with fallback)
export const PLAN_GENERATION_MAX_RETRIES = 2;
