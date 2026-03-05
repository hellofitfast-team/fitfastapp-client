# FitFast Backend Validation & Reference

> **Last validated:** March 2026
> **Status:** Production-hardened for 500-1000 clients per deployment
> **Backend:** Convex 1.31 (real-time, serverless)
> **TypeScript:** Zero errors across all 3 apps + shared backend

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Durable Workflow Pipeline](#durable-workflow-pipeline)
- [AI Generation Engine](#ai-generation-engine)
- [Nutrition Engine](#nutrition-engine)
- [OCR Pipeline](#ocr-pipeline)
- [Client Context Builder](#client-context-builder)
- [Email System](#email-system)
- [Notification & Reminders](#notification--reminders)
- [Knowledge Base (RAG)](#knowledge-base-rag)
- [Admin Stats (Denormalized Counters)](#admin-stats-denormalized-counters)
- [Backend Constants](#backend-constants)
- [Error Handling Patterns](#error-handling-patterns)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [Production Hardening Audit](#production-hardening-audit)
- [Observability & Logging](#observability--logging)
- [Known Edge Cases & Mitigations](#known-edge-cases--mitigations)
- [Verification Checklist](#verification-checklist)

---

## Architecture Overview

### Request Flow

```
Client/Admin/Marketing App
    ↓
Convex Auth (middleware validates JWT)
    ↓
Query/Mutation (real-time subscriptions)
    ↓
Internal Actions (Node.js runtime for AI, email, OCR)
    ↓
External APIs (OpenRouter, Resend, Web Push)
```

### Key Backend Files

| File                             | Purpose                                | Runtime                |
| -------------------------------- | -------------------------------------- | ---------------------- |
| `convex/ai.ts`                   | AI plan generation + translation       | Node.js (`"use node"`) |
| `convex/checkInWorkflow.ts`      | Durable workflow orchestration         | Convex runtime         |
| `convex/nutritionEngine.ts`      | Deterministic calorie/macro calculator | Convex runtime         |
| `convex/workoutSplitEngine.ts`   | Deterministic workout split selector   | Convex runtime         |
| `convex/clientContext.ts`        | Builds unified AI prompt context       | Convex runtime         |
| `convex/ocrExtraction.ts`        | Payment + InBody OCR via Qwen3-VL      | Node.js                |
| `convex/email.ts`                | 6 bilingual email templates via Resend | Node.js                |
| `convex/notifications.ts`        | Web Push notifications                 | Node.js                |
| `convex/cronJobs.ts`             | Per-user dynamic reminder scheduling   | Convex runtime         |
| `convex/knowledgeBaseActions.ts` | RAG embedding + PDF processing         | Node.js                |
| `convex/constants.ts`            | All shared magic numbers               | Convex runtime         |
| `convex/rateLimiter.ts`          | API rate limiting                      | Convex runtime         |
| `convex/adminStats.ts`           | O(1) dashboard counters                | Convex runtime         |

### Concurrency Model

- **Workpool:** Max 5 concurrent AI generation calls (`@convex-dev/workpool`). If 50 clients check in simultaneously, 45 queue and execute as slots free.
- **Workflow:** Durable step-based execution (`@convex-dev/workflow`). Survives Convex function restarts — each `step.run*()` is an idempotent checkpoint.
- **Rate limiting:** Fixed-window per-user limits on check-ins (3/day), signups (5/hour), uploads (10/hour).

---

## Durable Workflow Pipeline

**File:** `convex/checkInWorkflow.ts`

The check-in → plan generation → notification flow is orchestrated as a durable workflow with 7 steps:

```
Step 1: Persist check-in record (mutation)
    ↓
Steps 2-3: Enqueue meal + workout plan generation in parallel (workpool)
    ↓
Steps 4-5: Poll workpool until both finish (bounded, max 60 attempts)
    ↓
Step 6: Send push notification (best-effort, try-catch)
    ↓
Step 7: Send email fallback (best-effort, try-catch)
    ↓
Return { checkInId, mealPlanId, workoutPlanId }
```

### Polling Safeguards

Both polling loops (Steps 4 & 5) are bounded:

| Guard            | Behavior                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Max attempts** | 60 poll iterations per plan type. Throws timeout error if exceeded.                                 |
| **Null check**   | If `getWorkStatus` returns `null` (workpool entry lost), throws immediately with descriptive error. |
| **State check**  | Only exits on `state === "finished"`. Any other state continues polling.                            |

### Notification Isolation

Steps 6 and 7 are wrapped in individual try-catch blocks:

- Push notification failure → logs error, continues to email fallback
- Email failure → logs error, still returns success
- **Rationale:** Plans are already saved in the database. The user will see them on next app visit regardless. Notification is best-effort.

### InBody OCR Scheduling

When `measurementMethod === "inbody"` and `inBodyStorageId` is provided, InBody OCR is scheduled as a fire-and-forget action immediately after check-in persistence (Step 1). OCR results are patched onto the check-in record asynchronously.

---

## AI Generation Engine

**File:** `convex/ai.ts`

### Models

| Model                           | Use Case                               | Input Cost     | Output Cost    |
| ------------------------------- | -------------------------------------- | -------------- | -------------- |
| `deepseek/deepseek-v3.2`        | Meal plans, workout plans, translation | $0.25/M tokens | $0.40/M tokens |
| `qwen/qwen3-vl-8b-instruct`     | Payment OCR, InBody OCR                | $0.06/M tokens | $0.40/M tokens |
| `openai/text-embedding-3-small` | RAG embeddings (1536 dims)             | —              | —              |

### Token Budgets

| Plan Type    | English       | Arabic        | Retry Budget  |
| ------------ | ------------- | ------------- | ------------- |
| Meal plan    | 12,000 tokens | 16,000 tokens | 16,000 tokens |
| Workout plan | 16,000 tokens | 20,000 tokens | 20,000 tokens |

Arabic budgets are ~33% higher because Arabic text tokenizes less efficiently in most LLM tokenizers.

### Generation Flow

```
1. Fetch client context (with retry for assessment visibility race)
2. Validate anthropometric data (weight, height, age ranges)
3. Guard training days (Math.max(1, ...))
4. Calculate nutrition targets / select workout split (deterministic)
5. Fetch coach RAG knowledge (filtered by plan type tags)
6. Fetch food database reference (meal plans only)
7. Build system + user prompts
8. Call generateText() with timeout + retries
9. If truncated (finishReason=length), retry with simplified prompt
10. Extract JSON (robust parser with repair)
11. Validate + auto-correct plan data
12. Log generation duration
13. Save to database
```

### Assessment Retry Logic

When triggered immediately after assessment submission (via scheduler), the assessment may not be visible in the action's read snapshot due to Convex's consistency model.

| Parameter             | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| Max retries           | 3                                                                      |
| Delay between retries | 1,500ms                                                                |
| Total window          | ~4.5 seconds                                                           |
| Failure behavior      | Throws user-facing error: "Please complete your initial assessment..." |

### Anthropometric Data Validation

Applied before nutrition calculation in the meal plan handler:

| Field  | Valid Range  | Default on Out-of-Range |
| ------ | ------------ | ----------------------- |
| Weight | 30–300 kg    | 75 kg                   |
| Height | 100–250 cm   | 170 cm                  |
| Age    | 13–120 years | 30 years                |

Out-of-range values are logged as warnings with the user ID.

### JSON Extraction & Repair

The `extractJSON()` function handles messy LLM output:

1. Strip markdown code fences (`\`\`\`json`)
2. Extract outermost `{ ... }` from surrounding text
3. Try direct `JSON.parse()`
4. Fix trailing commas before `}` or `]`
5. Handle truncated JSON: count unmatched braces/brackets, close them
6. Close unclosed strings
7. Final `JSON.parse()` — throws if still broken

### Post-Generation Validation

**Meal plans** (`validateAndCorrectMealPlan`):

- Sum per-meal macros → auto-correct `dailyTotals` if mismatched
- Per-meal macro cross-check: P×4 + C×4 + F×9 ≈ claimed calories (±30 cal)
- If day total >10% off from nutrition target → scale all meals proportionally
  - Carbs derived from calorie remainder (avoids cumulative rounding errors)
- Flag zero-calorie or zero-protein meals
- Flag days below minimum calorie floor

**Workout plans** (`validateWorkoutPlan`):

- Flag training days with no exercises
- Flag missing warmup or cooldown sections

### Truncation Handling

```
Attempt 1: Full prompt with standard token budget
    ↓ (finishReason === "length")
Attempt 2: Simplified prompt (fewer meals/exercises, no alternatives)
    ↓ (finishReason === "length" again)
Throw user-facing error: "Plan too long for AI model output limit"
```

### Calorie Scaling Fix

When scaling meals to hit daily calorie targets, the algorithm avoids cumulative rounding errors:

```
1. Calculate scaleFactor = targetCalories / actualCalories
2. Scale protein: round(sumProtein × scaleFactor)
3. Scale fat: round(sumFat × scaleFactor)
4. Derive carbs: round((targetCalories - scaledProtein×4 - scaledFat×9) / 4)
5. Apply proportional scaling to individual meals
```

This ensures `dailyTotals.calories` always equals the target exactly, with carbs absorbing any rounding remainder.

### Translation Action

- **Auth:** Requires authentication
- **Input:** Truncated to 500 characters (prevents abuse — intended for short UI strings)
- **Model:** Same `deepseek/deepseek-v3.2` with 100 max output tokens
- **Error handling:** Catches and re-throws with user-facing message

---

## Nutrition Engine

**File:** `convex/nutritionEngine.ts`

Deterministic calculation — no LLM involvement. The AI prompt receives pre-calculated targets as hard constraints.

### Mifflin-St Jeor BMR

```
Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
```

### Activity Multiplier

Blended: `lifestyle_base + (training_days × 0.05)`, capped at 1.9.

| Lifestyle         | Base Multiplier |
| ----------------- | --------------- |
| Sedentary         | 1.2             |
| Lightly active    | 1.375           |
| Moderately active | 1.55            |
| Very active       | 1.725           |

### Goal Multipliers

| Goal                                  | Multiplier         |
| ------------------------------------- | ------------------ |
| Weight loss / fat loss / cutting      | 0.80 (20% deficit) |
| Muscle gain / bulking                 | 1.10 (10% surplus) |
| Maintenance / recomposition / general | 1.00               |

### Macro Distribution

```
Calories = max(minCalories, TDEE × goalMultiplier)
Protein  = weight(kg) × proteinPerKg    → round
Fat      = weight(kg) × 0.9             → round
Carbs    = (Calories − Protein×4 − Fat×9) / 4 → round, min 50g
```

### Protein Per Kg (ISSN Guidelines)

| Goal    | g/kg |
| ------- | ---- |
| Cutting | 2.0  |
| Bulking | 1.8  |
| General | 1.6  |

### Negative Calories Guard

If `protein×4 + fat×9 > calories` (possible with small/lean individuals on a deficit):

1. Calculate `maxFatCalories = calories − protein×4 − minCarbs×4`
2. Scale fat down: `max(weight×0.5, maxFatCalories/9)` — minimum 0.5g/kg for hormonal health
3. Recalculate carbs from remainder
4. Log warning with the scaling that occurred

### Minimum Calorie Floors

| Gender | Minimum    |
| ------ | ---------- |
| Male   | 1,500 kcal |
| Female | 1,200 kcal |

---

## OCR Pipeline

**File:** `convex/ocrExtraction.ts`

### Payment Screenshot OCR

- **Trigger:** Scheduled immediately after `createSignup` when `paymentScreenshotId` is provided
- **Model:** `qwen/qwen3-vl-8b-instruct` (300 max tokens)
- **Extracted fields:** amount, sender_name, reference_number, date, bank
- **Error handling:** Non-critical — catches all errors, logs, and returns. Signup exists without OCR data.

### InBody OCR

- **Trigger:** Scheduled after check-in save when `measurementMethod === "inbody"`
- **Model:** Same `qwen/qwen3-vl-8b-instruct`
- **Extracted fields:** bodyFatPercentage, leanBodyMass, skeletalMuscleMass, bmi, visceralFatLevel, basalMetabolicRate, totalBodyWater

### InBody Range Validation

OCR-extracted values are validated against physiological ranges before storage:

| Field              | Valid Range    | Action if Out-of-Range       |
| ------------------ | -------------- | ---------------------------- |
| bodyFatPercentage  | 3–60%          | Skipped (not stored), logged |
| leanBodyMass       | 20–150 kg      | Skipped                      |
| skeletalMuscleMass | 10–80 kg       | Skipped                      |
| bmi                | 10–60          | Skipped                      |
| visceralFatLevel   | 1–30           | Skipped                      |
| basalMetabolicRate | 800–4,000 kcal | Skipped                      |
| totalBodyWater     | 10–80 L        | Skipped                      |

String-to-number parsing is applied as fallback (Qwen3-VL sometimes returns numbers as strings).

---

## Client Context Builder

**File:** `convex/clientContext.ts`

Builds a unified context object for AI prompts. Aggregates data from 7 tables in a single query:

| Data                   | Source Table                        | Limits                     |
| ---------------------- | ----------------------------------- | -------------------------- |
| Profile                | profiles                            | Single record              |
| Assessment             | initialAssessments                  | Single record              |
| Assessment changes     | assessmentHistory                   | Latest version only        |
| Current check-in       | checkIns                            | By ID                      |
| Check-in history       | checkIns                            | Last 5 (excluding current) |
| Meal/workout adherence | mealCompletions, workoutCompletions | Last plan's completions    |
| Recent reflections     | dailyReflections                    | Last 7 entries             |

### Prompt Formatting

`formatContextForPrompt()` converts the context into a compact, token-efficient string. Includes:

- Static data (goals, body, age, gender, experience, schedule, preferences, allergies, restrictions)
- Assessment changes (if reassessment happened)
- Weight trend (chronological progression)
- Average energy/sleep across recent check-ins
- Current check-in snapshot
- Adherence data (meal and workout percentages)
- Recent reflections (truncated to 80 chars each)

### Input Sanitization

User-provided text fields are sanitized before injection into AI prompts via `sanitizeForPrompt()`:

| Guard                    | Implementation                                   |
| ------------------------ | ------------------------------------------------ |
| **Length truncation**    | Default 500 chars, 80 chars for reflections      |
| **Newline collapse**     | 3+ consecutive newlines → 2                      |
| **Role injection**       | Strips `system:`, `assistant:`, `user:` prefixes |
| **Instruction override** | Strips "ignore previous instructions" patterns   |

Applied to: `workoutPerformance`, `newInjuries`, `notes`, `reflection` fields.

---

## Email System

**File:** `convex/email.ts`

### Templates

| Template     | Trigger                                  | Skip Condition                    |
| ------------ | ---------------------------------------- | --------------------------------- |
| Invitation   | Signup approved → invite token generated | —                                 |
| Welcome      | Account created                          | —                                 |
| Plan Ready   | AI plans generated                       | User has active push subscription |
| Ticket Reply | Coach replies to ticket                  | —                                 |
| Reminder     | Check-in reminder cron                   | User has active push subscription |
| Rejection    | Signup rejected                          | —                                 |

### Security

- All user-provided text is escaped via `escapeHtml()` (prevents XSS in email HTML)
- Ticket subjects are escaped in both email body AND email subject line
- `escapeHtml` covers: `&`, `<`, `>`, `"`

### Graceful Degradation

- **Missing `RESEND_API_KEY`:** Logs warning and returns early instead of throwing. This prevents email failures from crashing the workflow — plans are still saved and visible in-app.
- **Resend API errors:** Thrown as-is (retried by the action retrier if called via workflow).

### Environment Variables

| Variable            | Default                         | Required                                  |
| ------------------- | ------------------------------- | ----------------------------------------- |
| `RESEND_API_KEY`    | —                               | Yes (but graceful degradation if missing) |
| `RESEND_FROM_EMAIL` | `FitFast <noreply@fitfast.app>` | No                                        |
| `CLIENT_APP_URL`    | `https://app.fitfast.app`       | No (used in invite links)                 |

---

## Notification & Reminders

### Push Notifications

- **Library:** `web-push` 3.6
- **Retrier config:** 5 retries, 2,000ms initial backoff, base 2 exponential (~62s total coverage)
- **Previous config:** 3 retries, 1,000ms initial backoff (~7s total) — insufficient for FCM outages

### Dynamic Cron Reminders

**File:** `convex/cronJobs.ts`

Per-user daily reminder scheduling via `@convex-dev/crons`.

| Operation        | Function                                     |
| ---------------- | -------------------------------------------- |
| Schedule/replace | `scheduleUserReminder(userId, reminderTime)` |
| Cancel           | `cancelUserReminder(userId)`                 |
| List all         | `listUserReminders()` (coach debugging)      |

### Reminder Time Validation

`reminderTime` format: `"HH:MM"` in UTC.

| Check  | Range              | Error                                                                             |
| ------ | ------------------ | --------------------------------------------------------------------------------- |
| Hour   | 0–23               | `Invalid reminder time "XX:YY" — expected "HH:MM" with hour 0-23 and minute 0-59` |
| Minute | 0–59               | Same                                                                              |
| NaN    | `parseInt` failure | Same                                                                              |

Validated before cron registration. Previously, invalid times like `"25:99"` would produce `NaN NaN * * *` cron specs.

---

## Knowledge Base (RAG)

**File:** `convex/knowledgeBaseActions.ts`

### Embedding Pipeline

```
Coach uploads text/PDF → create coachKnowledge entry → embed entry via RAG
```

| Step                              | Error Handling                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Text embedding** (`embedEntry`) | Try-catch around `rag.add()`. On failure: logs error with entry ID and title. Entry exists in DB but is unsearchable until re-embedded. |
| **PDF download**                  | Returns early if blob not found (logs error).                                                                                           |
| **PDF parsing**                   | Try-catch around `pdf-parse`. On failure: patches entry with empty content, logs error. Entry is visible in UI as failed.               |
| **Text extraction**               | If no text extracted: patches entry with empty content, logs warning.                                                                   |

### Search

- **Namespace:** `coach_knowledge`
- **Chunking:** 500 words per chunk, 50-word overlap
- **Filters:** Tag-based (OR logic): `["nutrition", "general"]` for meal plans, `["workout", "recovery", "general"]` for workout plans
- **Limit:** 5 chunks per search
- **Error handling:** Returns empty array if namespace doesn't exist yet

---

## Admin Stats (Denormalized Counters)

**File:** `convex/adminStats.ts`

Three `@convex-dev/aggregate` instances provide O(1) dashboard counts.

### Write Paths (All Accounted For)

| Counter               | Increment Paths                                                       | Decrement Paths                                           |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `pendingSignupsCount` | `createSignup`, `createRenewalSignup`                                 | `approveSignup`, `rejectSignup`                           |
| `openTicketsCount`    | `createTicket`                                                        | `closeTicket`                                             |
| `activeClientsCount`  | `updateClientStatus` (→ active), `onNewUserCreated` (approved signup) | `updateClientStatus` (→ inactive/expired), `rejectClient` |

**Note:** The `onNewUserCreated` increment was added during production hardening. Previously, profiles created via the invite flow (approved signups) were `status: "active"` but never incremented the counter — causing permanent dashboard undercount.

---

## Backend Constants

**File:** `convex/constants.ts`

### Check-in & Scheduling

| Constant                          | Value | Purpose                                   |
| --------------------------------- | ----- | ----------------------------------------- |
| `DEFAULT_CHECK_IN_FREQUENCY_DAYS` | 14    | Default cycle length (coach-configurable) |

### Data Retention

| Constant              | Value | Purpose                       |
| --------------------- | ----- | ----------------------------- |
| `DATA_RETENTION_DAYS` | 90    | Inactive user purge threshold |

### AI Workpool

| Constant             | Value | Purpose                        |
| -------------------- | ----- | ------------------------------ |
| `MAX_AI_CONCURRENCY` | 5     | Concurrent AI generation calls |

### AI Generation

| Constant                      | Value           | Purpose                            |
| ----------------------------- | --------------- | ---------------------------------- |
| `MEAL_OUTPUT_TOKENS_EN`       | 12,000          | English meal plan token budget     |
| `MEAL_OUTPUT_TOKENS_AR`       | 16,000          | Arabic meal plan token budget      |
| `WORKOUT_OUTPUT_TOKENS_EN`    | 16,000          | English workout plan token budget  |
| `WORKOUT_OUTPUT_TOKENS_AR`    | 20,000          | Arabic workout plan token budget   |
| `PLAN_GENERATION_TIMEOUT_MS`  | 240,000 (4 min) | AbortSignal timeout per generation |
| `PLAN_GENERATION_MAX_RETRIES` | 2               | Retries on first attempt           |

### Notifications

| Constant                          | Value | Purpose                        |
| --------------------------------- | ----- | ------------------------------ |
| `NOTIFICATION_MAX_RETRIES`        | 5     | Push/email retry attempts      |
| `NOTIFICATION_INITIAL_BACKOFF_MS` | 2,000 | First retry delay              |
| `NOTIFICATION_BACKOFF_BASE`       | 2     | Exponential backoff multiplier |

Total retry coverage: ~62 seconds (2s + 4s + 8s + 16s + 32s).

### RAG

| Constant                  | Value | Purpose                   |
| ------------------------- | ----- | ------------------------- |
| `RAG_CHUNK_SIZE_WORDS`    | 500   | Knowledge base chunk size |
| `RAG_CHUNK_OVERLAP_WORDS` | 50    | Overlap between chunks    |

### Caching

| Constant               | Value             | Purpose                  |
| ---------------------- | ----------------- | ------------------------ |
| `FAQ_CACHE_TTL_MS`     | 3,600,000 (1h)    | FAQ action cache TTL     |
| `PRICING_CACHE_TTL_MS` | 1,800,000 (30min) | Pricing action cache TTL |

### Upload Limits

| Constant                | Value | Purpose               |
| ----------------------- | ----- | --------------------- |
| `MAX_UPLOAD_SIZE_BYTES` | 5 MB  | Per-file upload limit |
| `MAX_CHECK_IN_PHOTOS`   | 4     | Photos per check-in   |
| `MAX_PRICING_PLANS`     | 4     | Coach pricing tiers   |

### Nutrition Engine

```
NUTRITION.goalMultipliers.deficit      = 0.80
NUTRITION.goalMultipliers.surplus      = 1.10
NUTRITION.goalMultipliers.maintenance  = 1.00
NUTRITION.proteinPerKg.cutting         = 2.0
NUTRITION.proteinPerKg.bulking         = 1.8
NUTRITION.proteinPerKg.general         = 1.6
NUTRITION.fatPerKg                     = 0.9
NUTRITION.minCarbsG                    = 50
NUTRITION.minCalories.male             = 1500
NUTRITION.minCalories.female           = 1200
NUTRITION.exerciseBonusPerDay          = 0.05
NUTRITION.maxActivityMultiplier        = 1.9
```

---

## Error Handling Patterns

### Pattern 1: Best-Effort Side Effects

Used when a side effect (notification, email) should not block the critical path.

```typescript
// Plans are saved → notification is best-effort
try {
  await step.runAction(internal.notifications.sendPlanReadyNotification, { ... });
} catch (err) {
  console.error("[Workflow] Push notification failed, continuing", err);
}
```

**Applied to:** Workflow Steps 6 & 7 (push + email).

### Pattern 2: Graceful Degradation on Missing Config

Used when a missing environment variable should degrade gracefully, not crash.

```typescript
if (!apiKey) {
  console.warn("[Email] RESEND_API_KEY not configured — skipping email send.");
  return;
}
```

**Applied to:** `sendEmail()` helper.

### Pattern 3: Bounded Polling

Used when polling an external state that may never resolve.

```typescript
let pollCount = 0;
while (status?.state !== "finished") {
  pollCount++;
  if (status === null) throw new Error("Entry lost");
  if (pollCount >= MAX_POLL_ATTEMPTS) throw new Error("Timed out");
  status = await step.runQuery(...);
}
```

**Applied to:** Workpool polling in workflow Steps 4 & 5.

### Pattern 4: Range Validation at System Boundaries

Used when data comes from external sources (OCR, user input, AI output).

```typescript
if (num < min || num > max) {
  console.warn(`[OCR] ${field}=${num} outside range [${min}, ${max}], skipping`);
} else {
  data[field] = num;
}
```

**Applied to:** InBody OCR fields, anthropometric data before nutrition calculation.

### Pattern 5: Fire-and-Forget with Logging

Used for non-critical background processing that should never crash the parent.

```typescript
// Non-critical — don't throw. The check-in exists without InBody data.
} catch (err) {
  console.error("[OCR] Extraction failed", { checkInId, error: err.message });
}
```

**Applied to:** Payment OCR, InBody OCR, RAG embedding.

---

## Input Validation & Sanitization

### User Input → AI Prompt

| Field              | Source           | Max Length | Sanitization                                 |
| ------------------ | ---------------- | ---------- | -------------------------------------------- |
| workoutPerformance | Check-in form    | 500 chars  | Newline collapse, role/instruction stripping |
| newInjuries        | Check-in form    | 500 chars  | Same                                         |
| notes              | Check-in form    | 500 chars  | Same                                         |
| reflection         | Daily reflection | 80 chars   | Same                                         |

### User Input → Email

| Field           | Source      | Sanitization                                |
| --------------- | ----------- | ------------------------------------------- |
| fullName        | Profile     | `escapeHtml()`                              |
| ticketSubject   | Ticket form | `escapeHtml()` (both body and subject line) |
| coachMessage    | Coach reply | `escapeHtml()`                              |
| rejectionReason | Coach input | `escapeHtml()`                              |

### Cron Input

| Field        | Source        | Validation                                                     |
| ------------ | ------------- | -------------------------------------------------------------- |
| reminderTime | User settings | Parsed `parseInt`, validated hour 0-23, minute 0-59, NaN check |

### Translation Input

| Field | Source   | Validation                            |
| ----- | -------- | ------------------------------------- |
| text  | Admin UI | Truncated to 500 chars, auth required |

---

## Production Hardening Audit

### CRITICAL Fixes (6)

| #   | Fix                                                  | File                    | Impact                                             |
| --- | ---------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| 1A  | Bounded polling loops (max 60 attempts + null check) | checkInWorkflow.ts      | Prevents infinite workflow hangs                   |
| 1B  | Try-catch on notification/email steps                | checkInWorkflow.ts      | Plans always returned despite notification failure |
| 1C  | `activeClientsCount` increment in invite flow        | profiles.ts             | Dashboard counter accuracy                         |
| 1D  | Negative calories guard (scale fat down)             | nutritionEngine.ts      | Prevents nonsensical macro distributions           |
| 1E  | Cron reminder time validation                        | cronJobs.ts             | Prevents `NaN NaN * * *` cron specs                |
| 1F  | Error handling for RAG embedding + PDF parsing       | knowledgeBaseActions.ts | Prevents unsearchable zombie entries               |

### HIGH Fixes (7)

| #   | Fix                                                 | File             | Impact                                        |
| --- | --------------------------------------------------- | ---------------- | --------------------------------------------- |
| 2A  | `Math.max(1, trainingDays)` guard                   | ai.ts            | Prevents 0-day training plans                 |
| 2B  | Anthropometric range validation (weight/height/age) | ai.ts            | Prevents nonsensical BMR from bad data        |
| 2C  | 3 retries × 1.5s for assessment visibility          | ai.ts            | Reduces race condition window from 2s to 4.5s |
| 2D  | Carbs derived from calorie remainder after scaling  | ai.ts            | Eliminates cumulative rounding errors         |
| 2E  | InBody OCR physiological range validation           | ocrExtraction.ts | Rejects `bodyFatPercentage: 999`              |
| 2F  | Removed dead `parseError` check                     | ai.ts            | Eliminated dead code / reader confusion       |
| 2G  | AI generation duration logging                      | ai.ts            | Enables latency monitoring and optimization   |

### MEDIUM Fixes (7)

| #   | Fix                                                 | File                | Impact                                                 |
| --- | --------------------------------------------------- | ------------------- | ------------------------------------------------------ |
| 3A  | AI magic numbers → named constants                  | constants.ts, ai.ts | Single source of truth for token budgets               |
| 3B  | `sanitizeForPrompt()` on user text                  | clientContext.ts    | Truncation + prompt injection defense                  |
| 3C  | Translation input truncation (500 chars)            | ai.ts               | Prevents abuse of translation endpoint                 |
| 3D  | Notification retrier: 5 retries, 2s initial backoff | constants.ts        | Survives 1-minute FCM/Resend outages                   |
| 3E  | Graceful `RESEND_API_KEY` missing handling          | email.ts            | Email failure doesn't crash workflows                  |
| 3F  | Clear error on double-truncation                    | ai.ts               | Actionable error instead of generic JSON parse failure |
| 3G  | `escapeHtml()` on email subject lines               | email.ts            | Prevents header injection via ticket subjects          |

---

## Observability & Logging

### Log Prefixes

| Prefix                     | Module                  | Example                                                              |
| -------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `[AI]`                     | ai.ts                   | `[AI] Meal plan generated in 45230ms for user abc123`                |
| `[Workflow]`               | checkInWorkflow.ts      | `[Workflow] Push notification failed for user abc123`                |
| `[NutritionEngine]`        | nutritionEngine.ts      | `[NutritionEngine] Fat scaled down to 35g — exceeded calorie target` |
| `[OCR:extractPaymentData]` | ocrExtraction.ts        | `[OCR:extractPaymentData] Extraction failed`                         |
| `[OCR:extractInBodyData]`  | ocrExtraction.ts        | `[OCR:extractInBodyData] bmi=999 outside range, skipping`            |
| `[RAG]`                    | knowledgeBaseActions.ts | `[RAG] Embedding failed for entry xyz`                               |
| `[KnowledgeBase]`          | knowledgeBaseActions.ts | `[KnowledgeBase] PDF parsing failed for entry xyz`                   |
| `[Email]`                  | email.ts                | `[Email] RESEND_API_KEY not configured — skipping`                   |

### Key Metrics (via logs)

| Metric              | Log Pattern                                 | Example                                  |
| ------------------- | ------------------------------------------- | ---------------------------------------- |
| AI latency          | `[AI] {type} plan generated in {ms}ms`      | `[AI] Meal plan generated in 45230ms`    |
| Truncation rate     | `[AI] {type} plan truncated for user`       | Indicates token budget may need increase |
| Validation warnings | `[AI] {type} plan validation: {n} warnings` | Indicates AI output quality issues       |
| OCR skip rate       | `[OCR] {field}={value} outside range`       | Indicates OCR hallucination frequency    |

---

## Known Edge Cases & Mitigations

### 1. Empty Training Schedule

**Scenario:** Client submits assessment with `scheduleAvailability: { days: [] }`.
**Mitigation:** `Math.max(1, days.length ?? 4)` ensures minimum 1 training day.

### 2. Extreme Body Composition

**Scenario:** 45kg female on a cutting diet. Protein (90g=360cal) + fat (40g=360cal) = 720cal, close to the 1200cal floor.
**Mitigation:** Negative calories guard scales fat down while preserving protein. Minimum fat: 0.5g/kg for hormonal health.

### 3. Workpool Entry Loss

**Scenario:** Database corruption or TTL expiry causes workpool entry to return `null`.
**Mitigation:** Null check throws immediately with descriptive error including the workId.

### 4. AI Action Crash Without State Update

**Scenario:** OpenRouter action crashes (OOM, network timeout) without updating workpool state to "finished".
**Mitigation:** Polling loop has max 60 attempts. Throws timeout error instead of hanging.

### 5. Notification Service Outage

**Scenario:** FCM (push) or Resend (email) is down for 2–5 minutes.
**Mitigation:** 5 retries with exponential backoff covering ~62 seconds. Beyond that, plans are still in the database.

### 6. Corrupted PDF Upload

**Scenario:** Coach uploads a file that isn't actually a PDF, or a corrupted PDF.
**Mitigation:** PDF parsing wrapped in try-catch. On failure, entry is created with empty content (visible in UI) and error is logged.

### 7. Invalid Cron Time

**Scenario:** Malformed `reminderTime` like `"25:99"` or `"abc"`.
**Mitigation:** Hour (0-23) and minute (0-59) validated after parsing. Throws descriptive error before cron registration.

### 8. OCR Hallucination

**Scenario:** Qwen3-VL returns `bodyFatPercentage: 500` from a blurry InBody scan.
**Mitigation:** All 7 InBody fields validated against physiological ranges. Values outside range are skipped entirely.

### 9. Double Truncation

**Scenario:** Both the initial and simplified retry prompts produce truncated output.
**Mitigation:** Clear user-facing error: "Plan too long for AI model output limit. Try reducing plan duration."

### 10. Missing Email API Key

**Scenario:** Deployment without `RESEND_API_KEY` configured (common during initial setup).
**Mitigation:** `sendEmail()` logs warning and returns early instead of throwing. All callers continue normally.

---

## Verification Checklist

| #   | Test                                                        | Expected Result                                             | Status |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| 1   | Submit check-in → verify plans generate + notification sent | Workflow returns `{ checkInId, mealPlanId, workoutPlanId }` | ⬜     |
| 2   | Kill notification action mid-flight                         | Plans returned, workflow doesn't hang                       | ⬜     |
| 3   | Test weight=45kg, goal=bulking                              | No negative carbs, macros sum to calories                   | ⬜     |
| 4   | Call `scheduleUserReminder` with `"25:99"`                  | Throws descriptive error                                    | ⬜     |
| 5   | Upload corrupted PDF                                        | Entry created with warning, no crash                        | ⬜     |
| 6   | Check-in with empty schedule (0 training days)              | Guard activates, uses 1 training day                        | ⬜     |
| 7   | Create user via invite flow                                 | `activeClientsCount` increments                             | ⬜     |
| 8   | `pnpm type-check`                                           | Zero errors across all 3 apps                               | ✅     |
| 9   | InBody OCR returns `bmi: 999`                               | Value skipped, other valid fields stored                    | ⬜     |
| 10  | Remove `RESEND_API_KEY` → trigger plan generation           | Warning logged, workflow completes                          | ⬜     |
