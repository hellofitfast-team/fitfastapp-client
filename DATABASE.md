# FitFast Database Validation & Reference

> **Last validated:** March 2026
> **Status:** Production-ready for 500-1000 clients per deployment
> **Backend:** Convex 1.31 (real-time, serverless)

---

## Table of Contents

- [Schema Overview](#schema-overview)
- [Table Definitions](#table-definitions)
- [Reusable Validators](#reusable-validators)
- [Index Catalog](#index-catalog)
- [Validator Alignment Audit](#validator-alignment-audit)
- [v.any() Usage & Justification](#vany-usage--justification)
- [Rate Limiters](#rate-limiters)
- [Convex Components](#convex-components)
- [Query Performance](#query-performance)
- [Data Retention & Cleanup](#data-retention--cleanup)
- [Database Constants](#database-constants)
- [Admin Stats (Denormalized Counters)](#admin-stats-denormalized-counters)
- [Known Tradeoffs](#known-tradeoffs)

---

## Schema Overview

17 application tables + auth tables (managed by `@convex-dev/auth`). All defined in `convex/schema.ts`.

| Table              | Row Estimate (1000 clients) | Hot Path | Purpose                            |
| ------------------ | --------------------------- | -------- | ---------------------------------- |
| profiles           | ~1,001                      | Yes      | User accounts (1 coach + clients)  |
| initialAssessments | ~1,000                      | No       | One-time health profile per client |
| assessmentHistory  | ~2,000                      | No       | Audit trail of assessment edits    |
| checkIns           | ~26,000/yr                  | Yes      | Bi-weekly progress tracking        |
| mealPlans          | ~26,000/yr                  | Yes      | AI-generated nutrition plans       |
| workoutPlans       | ~26,000/yr                  | Yes      | AI-generated training plans        |
| mealCompletions    | ~182,000/yr                 | Yes      | Daily meal adherence tracking      |
| workoutCompletions | ~130,000/yr                 | Yes      | Daily workout adherence tracking   |
| dailyReflections   | ~100,000/yr                 | No       | Optional daily journaling          |
| tickets            | ~3,000                      | Yes      | Support conversations              |
| faqs               | ~50                         | No       | Coach-managed FAQ library          |
| pendingSignups     | ~2,000                      | No       | Signup approval flow               |
| systemConfig       | ~10                         | Yes      | Key-value deployment settings      |
| pushSubscriptions  | ~1,500                      | No       | Web Push API subscriptions         |
| fileMetadata       | ~30,000/yr                  | No       | File upload tracking               |
| foodDatabase       | ~200                        | No       | Coach-managed food/recipe library  |
| notificationLog    | ~52,000/yr                  | No       | Notification audit trail           |
| coachKnowledge     | ~50                         | No       | RAG knowledge base entries         |

---

## Table Definitions

### profiles

User account metadata. Links Convex Auth user to application data.

```
userId:                string              — Convex Auth user ID (references users._id)
fullName:              string?             — Display name
email:                 string?             — Email address
phone:                 string?             — Phone number
language:              "en" | "ar"         — UI language preference
planTier:              PlanTier?           — Subscription tier
status:                "pending_approval" | "active" | "inactive" | "expired"
planStartDate:         string?             — ISO date (YYYY-MM-DD)
planEndDate:           string?             — ISO date (YYYY-MM-DD)
isCoach:               boolean             — Coach vs client flag
notificationReminderTime: string?          — HH:MM format
inactiveSince:         number?             — Timestamp (ms)
updatedAt:             number              — Timestamp (ms)

Indexes: by_userId, by_isCoach, by_status
```

### initialAssessments

Client's health profile filled during onboarding. Updated when client edits assessment.

```
userId:                string
goals:                 string?
currentWeight:         number?             — kg
height:                number?             — cm
age:                   number?
gender:                "male" | "female"?
measurements:          { chest?, waist?, hips?, arms?, thighs?: number }?
scheduleAvailability:  { days?: string[], sessionDuration?: number, preferredTime?: string }?
foodPreferences:       string[]?
allergies:             string[]?
dietaryRestrictions:   string[]?
medicalConditions:     string[]?
injuries:              string[]?
exerciseHistory:       string?
activityLevel:         "sedentary" | "lightly_active" | "moderately_active" | "very_active"?
experienceLevel:       "beginner" | "intermediate" | "advanced"?
lifestyleHabits:       { equipment?: string, mealsPerDay?: number }?

Index: by_userId
```

### assessmentHistory

Audit trail for assessment changes. Stores full snapshot + changed field names.

```
userId:                string
assessmentSnapshot:    any                 — Full assessment at time of change
changedFields:         string[]            — Which fields were modified
versionNumber:         number              — Monotonic version counter
createdAt:             number              — Timestamp (ms)

Index: by_userId
```

### checkIns

Periodic progress tracking (bi-weekly by default).

```
userId:                string
submittedAt:           number?             — Timestamp (ms)
weight:                number?             — kg
measurementMethod:     "manual" | "inbody"?
measurements:          { chest?, waist?, hips?, arms?, thighs?: number }?
inBodyStorageId:       id<_storage>?       — InBody device export file
inBodyData:            { bodyFatPercentage?, leanBodyMass?, skeletalMuscleMass?,
                         bmi?, visceralFatLevel?, basalMetabolicRate?,
                         totalBodyWater?: number }?
workoutPerformance:    string?             — Subjective training notes
energyLevel:           number?             — 1-10 rating
sleepQuality:          number?             — 1-10 rating
dietaryAdherence:      number?             — 1-10 rating
newInjuries:           string?
progressPhotoIds:      id<_storage>[]?     — Legacy bulk array
progressPhotoFront:    id<_storage>?       — Front-facing photo
progressPhotoBack:     id<_storage>?       — Back-facing photo
progressPhotoSide:     id<_storage>?       — Side profile photo
notes:                 string?

Index: by_userId
```

### mealPlans / workoutPlans

AI-generated plans. Identical structure.

```
userId:                string
checkInId:             id<checkIns>?       — Check-in that triggered generation
planData:              any                 — Structured plan JSON (AI-generated)
aiGeneratedContent:    string?             — Full AI response text
streamId:              string?             — Persistent streaming session reference
language:              "en" | "ar"
startDate:             string              — YYYY-MM-DD
endDate:               string              — YYYY-MM-DD

Indexes: by_userId, by_userId_dates (compound: userId + startDate + endDate)
```

### mealCompletions / workoutCompletions

Daily adherence tracking. Identical structure pattern.

```
userId:                string
mealPlanId/workoutPlanId: id<mealPlans/workoutPlans>
date:                  string              — YYYY-MM-DD
mealIndex/workoutIndex: number             — 0-based index in plan
completed:             boolean
notes:                 string?

Indexes: by_userId_date, by_planId_date
```

### dailyReflections

```
userId:                string
date:                  string              — YYYY-MM-DD
reflection:            string?

Index: by_userId_date
```

### tickets

Coach-client support conversations. Messages stored as embedded array.

```
userId:                string              — Client who created
subject:               string
category:              "meal_issue" | "workout_issue" | "technical" | "bug_report" | "other"?
description:           string?
status:                "open" | "coach_responded" | "closed"
messages:              [{ sender: "client" | "coach", message: string, timestamp: number }]
screenshotId:          id<_storage>?
deviceInfo:            { browser?, os?, screenSize?, userAgent?: string }?
pageUrl:               string?
updatedAt:             number

Indexes: by_userId, by_userId_status, by_status, by_updatedAt
```

### faqs

```
question:              string
answer:                string
language:              "en" | "ar"
displayOrder:          number
updatedAt:             number

Index: by_language_order (compound: language + displayOrder)
```

### pendingSignups

```
email:                 string
fullName:              string
phone:                 string?
planId:                string?
planTier:              PlanTier?
transferReferenceNumber: string?
transferAmount:        string?
paymentScreenshotId:   id<_storage>?
ocrExtractedData:      { amount?, sender_name?, reference_number?, date?, bank?: string }?
status:                "pending" | "approved" | "rejected"
reviewedAt:            number?
rejectionReason:       string?
inviteToken:           string?             — 64-char token for invite link

Indexes: by_status, by_email, by_email_status, by_inviteToken
```

### systemConfig

Key-value store for coach-managed deployment settings.

```
key:                   string              — Unique config key
value:                 any                 — Varies by key type
updatedAt:             number

Index: by_key

Common keys:
- "pricing"                   → Plan pricing array
- "plans"                     → Plan definitions
- "paymentMethods"            → Bank transfer details
- "check_in_frequency_days"   → Number (default 14)
- "social_links"              → Social media URLs object
```

### pushSubscriptions

```
userId:                string
endpoint:              string              — Web Push subscription URL
p256dh:                string              — VAPID public key
auth:                  string              — Auth secret
deviceType:            string?
isActive:              boolean
updatedAt:             number

Indexes: by_userId, by_endpoint, by_isActive
```

### fileMetadata

```
storageId:             id<_storage>
uploadedBy:            string              — userId
uploadedAt:            number
purpose:               "progress_photo" | "ticket_screenshot" | "payment_proof" | "knowledge_pdf"

Indexes: by_storageId, by_uploadedBy, by_uploadedAt
```

### foodDatabase

```
name:                  string
nameAr:                string?
category:              "protein" | "carb" | "fat" | "vegetable" | "fruit" | "dairy" | "dessert" | "recipe"
tags:                  string[]
per100g:               { calories, protein, carbs, fat: number, fiber?: number }
isRecipe:              boolean
servingSize:           string?
perServing:            { calories, protein, carbs, fat: number }?
ingredients:           string[]?
instructions:          string[]?
source:                "usda" | "coach" | "verified_recipe"
isVerified:            boolean
createdAt:             number
updatedAt:             number

Indexes: by_category, by_isRecipe
Search index: search_name (searchField: "name", filterFields: ["category", "isRecipe"])
```

### notificationLog

```
type:                  "plan_ready" | "reminder" | "broadcast" | "individual"
title:                 string
body:                  string
recipientCount:        number
recipientUserId:       string?
sentAt:                number
sentBy:                string              — userId or "system"
status:                "sent" | "failed" | "partial"
failedCount:           number?

Index: by_sentAt
```

### coachKnowledge

```
title:                 string
type:                  "text" | "pdf"
content:               string?
storageId:             id<_storage>?
tags:                  string[]?           — "nutrition", "workout", "general"
createdAt:             number
updatedAt:             number

Indexes: by_type, by_createdAt
RAG: Entries are embedded via @convex-dev/rag for semantic search during AI generation.
```

---

## Reusable Validators

Extracted at the top of `convex/schema.ts` and reused across mutation args:

```typescript
const languageValidator = v.union(v.literal("en"), v.literal("ar"));
const planTierValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("3_months"),
  v.literal("6_months"),
  v.literal("12_months"),
);
const foodCategoryValidator = v.union(
  v.literal("protein"),
  v.literal("carb"),
  v.literal("fat"),
  v.literal("vegetable"),
  v.literal("fruit"),
  v.literal("dairy"),
  v.literal("dessert"),
  v.literal("recipe"),
);
const foodSourceValidator = v.union(
  v.literal("usda"),
  v.literal("coach"),
  v.literal("verified_recipe"),
);
const filePurposeValidator = v.union(
  v.literal("progress_photo"),
  v.literal("ticket_screenshot"),
  v.literal("payment_proof"),
  v.literal("knowledge_pdf"),
);
const genderValidator = v.union(v.literal("male"), v.literal("female"));
const ocrExtractedDataValidator = v.object({
  amount: v.optional(v.string()),
  sender_name: v.optional(v.string()),
  reference_number: v.optional(v.string()),
  date: v.optional(v.string()),
  bank: v.optional(v.string()),
});
```

---

## Index Catalog

### 35 indexes across 17 tables

| Table              | Index             | Fields                       | Query Pattern              |
| ------------------ | ----------------- | ---------------------------- | -------------------------- |
| profiles           | by_userId         | [userId]                     | Auth lookup                |
| profiles           | by_isCoach        | [isCoach]                    | Coach filtering            |
| profiles           | by_status         | [status]                     | Inactive/expired detection |
| assessmentHistory  | by_userId         | [userId]                     | Audit trail                |
| initialAssessments | by_userId         | [userId]                     | Assessment lookup          |
| checkIns           | by_userId         | [userId]                     | Check-in history           |
| mealPlans          | by_userId         | [userId]                     | All plans                  |
| mealPlans          | by_userId_dates   | [userId, startDate, endDate] | Active plan range query    |
| workoutPlans       | by_userId         | [userId]                     | All plans                  |
| workoutPlans       | by_userId_dates   | [userId, startDate, endDate] | Active plan range query    |
| mealCompletions    | by_userId_date    | [userId, date]               | Daily adherence            |
| mealCompletions    | by_planId_date    | [mealPlanId, date]           | Plan-specific adherence    |
| workoutCompletions | by_userId_date    | [userId, date]               | Daily adherence            |
| workoutCompletions | by_planId_date    | [workoutPlanId, date]        | Plan-specific adherence    |
| dailyReflections   | by_userId_date    | [userId, date]               | One reflection per day     |
| tickets            | by_userId         | [userId]                     | User's tickets             |
| tickets            | by_userId_status  | [userId, status]             | Unread badge (compound)    |
| tickets            | by_status         | [status]                     | Coach dashboard            |
| tickets            | by_updatedAt      | [updatedAt]                  | Recent tickets sort        |
| faqs               | by_language_order | [language, displayOrder]     | Sorted bilingual list      |
| pendingSignups     | by_status         | [status]                     | Pending approvals          |
| pendingSignups     | by_email          | [email]                      | Deduplication              |
| pendingSignups     | by_email_status   | [email, status]              | Compound lookup            |
| pendingSignups     | by_inviteToken    | [inviteToken]                | Accept invite link         |
| systemConfig       | by_key            | [key]                        | O(1) config lookup         |
| pushSubscriptions  | by_userId         | [userId]                     | User subscriptions         |
| pushSubscriptions  | by_endpoint       | [endpoint]                   | Deduplication              |
| pushSubscriptions  | by_isActive       | [isActive]                   | Active dispatch            |
| fileMetadata       | by_storageId      | [storageId]                  | Access control             |
| fileMetadata       | by_uploadedBy     | [uploadedBy]                 | Cascade delete             |
| fileMetadata       | by_uploadedAt     | [uploadedAt]                 | Orphan cleanup             |
| foodDatabase       | by_category       | [category]                   | Filter by type             |
| foodDatabase       | by_isRecipe       | [isRecipe]                   | Recipe vs ingredient       |
| notificationLog    | by_sentAt         | [sentAt]                     | Audit trail                |
| coachKnowledge     | by_type           | [type]                       | Text vs PDF                |
| coachKnowledge     | by_createdAt      | [createdAt]                  | Chronological              |

**Search indexes:** `foodDatabase.search_name` (full-text on `name`, filters: `category`, `isRecipe`)

---

## Validator Alignment Audit

All mutation `args` validators match their corresponding schema column types. Verified files:

| File               | Mutations/Actions                                               | Status                                     |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------ |
| checkIns.ts        | submitCheckIn, startCheckInWorkflow, getCheckInOcrStatus        | Aligned                                    |
| checkInWorkflow.ts | submitCheckInInternal, patchInBodyData, checkInAndGeneratePlans | Aligned                                    |
| mealPlans.ts       | savePlanInternal, updatePlanData                                | Aligned                                    |
| workoutPlans.ts    | savePlanInternal, updatePlanData                                | Aligned                                    |
| foodDatabase.ts    | addFood, insertFood, listFoods                                  | Aligned                                    |
| storage.ts         | generateUploadUrl, trackUploadedFile                            | Aligned                                    |
| pendingSignups.ts  | createSignup, createRenewalSignup, patchOcrData, markInviteUsed | Aligned                                    |
| assessments.ts     | submitAssessment                                                | Aligned                                    |
| tickets.ts         | createTicket, replyToTicket, respondToTicket, closeTicket       | Aligned                                    |
| profiles.ts        | All mutations                                                   | Aligned                                    |
| systemConfig.ts    | All mutations                                                   | Aligned (value is intentionally `v.any()`) |

---

## v.any() Usage & Justification

Only **4 fields** across the entire schema use `v.any()`:

| Table.Field                            | Why v.any() is correct                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mealPlans.planData`                   | AI-generated JSON. Structure evolves with prompt changes. Validated post-generation in `ai.ts` (macro cross-checks, calorie scaling). Typing would be brittle and break on every prompt iteration. |
| `workoutPlans.planData`                | Same as mealPlans — AI-generated, validated post-generation.                                                                                                                                       |
| `assessmentHistory.assessmentSnapshot` | Archives full assessment object for diff tracking. Shape matches `initialAssessments` but typing creates maintenance burden with no runtime benefit.                                               |
| `systemConfig.value`                   | Generic key-value store by design. Stores numbers, strings, arrays, objects depending on the key. This is the intended pattern.                                                                    |

---

## Rate Limiters

Defined in `convex/rateLimiter.ts`. All use fixed-window strategy.

| Name            | Rate | Period | Scope      | Purpose                        |
| --------------- | ---- | ------ | ---------- | ------------------------------ |
| submitCheckIn   | 3    | DAY    | Per userId | Anti-spam check-in submissions |
| createSignup    | 5    | HOUR   | Per email  | Prevent signup form abuse      |
| marketingUpload | 10   | HOUR   | Per IP/key | Unauthenticated file uploads   |

**Additional dynamic guard:** Max 2 AI plan generations per check-in cycle window (enforced in `startCheckInWorkflow` by counting recent plans).

---

## Convex Components

Registered in `convex/convex.config.ts`. 10 components, 3 aggregate instances.

| Component                              | Manager File        | Purpose                                     |
| -------------------------------------- | ------------------- | ------------------------------------------- |
| @convex-dev/workflow                   | workflowManager.ts  | Durable check-in → plan generation workflow |
| @convex-dev/workpool (aiWorkpool)      | workpoolManager.ts  | Max 5 concurrent AI generation calls        |
| @convex-dev/rag                        | ragManager.ts       | Coach knowledge base semantic search        |
| @convex-dev/persistent-text-streaming  | streamingManager.ts | Live plan generation progress               |
| @convex-dev/crons                      | cronJobs.ts         | Per-user dynamic reminder scheduling        |
| @convex-dev/aggregate (pendingSignups) | adminStats.ts       | Pending signup count                        |
| @convex-dev/aggregate (openTickets)    | adminStats.ts       | Open ticket count                           |
| @convex-dev/aggregate (activeClients)  | adminStats.ts       | Active client count                         |
| @convex-dev/action-retrier             | —                   | Auto-retry failed actions                   |
| @convex-dev/action-cache               | actionCache.ts      | TTL cache (FAQs: 1h, pricing: 30m)          |
| @convex-dev/migrations                 | migrations.ts       | Data migration framework                    |
| @convex-dev/rate-limiter               | rateLimiter.ts      | API rate limiting                           |

---

## Query Performance

### Hot-path queries (every page load)

| Query                    | File            | Strategy                                    | Notes                                     |
| ------------------------ | --------------- | ------------------------------------------- | ----------------------------------------- |
| getNavBadges             | navBadges.ts    | Compound index `by_userId_status`           | No post-index filter                      |
| getCurrentPlan (meal)    | mealPlans.ts    | Compound index `by_userId_dates` with `lte` | Falls back to `by_userId` for most recent |
| getCurrentPlan (workout) | workoutPlans.ts | Compound index `by_userId_dates` with `lte` | Falls back to `by_userId` for most recent |
| getLockStatus            | checkIns.ts     | `by_userId` index                           | Single `first()` call                     |
| getAdminStats            | adminStats.ts   | O(1) aggregate counters                     | No table scans                            |

### Acceptable full table scans

| Query                     | File              | Why acceptable                                                                   |
| ------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| getAllSignups             | pendingSignups.ts | Coach-only, max ~2000 rows, infrequent                                           |
| getAllTickets             | tickets.ts        | Coach-only, uses `by_updatedAt` index for sort                                   |
| getFoodReferenceForPrompt | foodDatabase.ts   | Internal query, background AI generation only, max ~200 rows                     |
| findOrphanedFiles         | storage.ts        | Runs at 03:00 UTC cron, zero users online, builds Set for O(1) membership checks |

---

## Data Retention & Cleanup

### Static cron jobs (`convex/staticCrons.ts`)

| Job                    | Schedule        | Action                                          |
| ---------------------- | --------------- | ----------------------------------------------- |
| storage-orphan-cleanup | 03:00 UTC daily | Delete unreferenced files older than 24h        |
| data-retention-cleanup | 04:00 UTC daily | Purge inactive/expired users older than 90 days |

### Storage orphan cleanup (`storage.ts`)

1. Query `fileMetadata` with `by_uploadedAt` index (only entries > 24h old)
2. Build `Set<string>` of all referenced storage IDs from: checkIns, tickets, pendingSignups, coachKnowledge
3. Delete unreferenced files from Convex storage + metadata record

### Data retention cleanup (`dataRetention.ts`)

- Threshold: `DATA_RETENTION_DAYS = 90`
- Targets: profiles with `status = "inactive"` or `"expired"` older than 90 days
- Cascade deletes all user data: reflections, completions, plans, check-ins, assessments, history, tickets, subscriptions, files, profile
- Uses `by_userId` indexes for efficient per-user deletion

---

## Database Constants

Defined in `convex/constants.ts`:

```
DEFAULT_CHECK_IN_FREQUENCY_DAYS = 14     — Coach-configurable via systemConfig
DATA_RETENTION_DAYS             = 90     — Inactive/expired user purge threshold
MAX_AI_CONCURRENCY              = 5      — Concurrent AI generation calls
RAG_CHUNK_SIZE_WORDS            = 500    — Knowledge base chunking
RAG_CHUNK_OVERLAP_WORDS         = 50     — Chunk overlap for context
FAQ_CACHE_TTL_MS                = 3.6M   — 1 hour
PRICING_CACHE_TTL_MS            = 1.8M   — 30 minutes
NOTIFICATION_MAX_RETRIES        = 3      — Push/email retry attempts
MAX_UPLOAD_SIZE_BYTES           = 5MB    — Per-file upload limit
MAX_CHECK_IN_PHOTOS             = 4      — Photos per check-in
MAX_PRICING_PLANS               = 4      — Coach pricing tiers
```

---

## Admin Stats (Denormalized Counters)

Three `@convex-dev/aggregate` instances provide O(1) dashboard counts:

| Counter             | Incremented                       | Decremented                 |
| ------------------- | --------------------------------- | --------------------------- |
| pendingSignupsCount | createSignup, createRenewalSignup | approveSignup, rejectSignup |
| openTicketsCount    | createTicket                      | closeTicket                 |
| activeClientsCount  | profile activation                | profile deactivation/expiry |

Query: `adminStats.getAdminStats()` returns all three counts in a single O(1) call.

---

## Known Tradeoffs

1. **Legacy `planTier` values** (`3_months`, `6_months`, `12_months`) — kept in validator for backward compatibility with existing data. New signups only use `monthly` or `quarterly`.

2. **`progressPhotoIds` (legacy array)** — kept alongside new `progressPhotoFront/Back/Side` fields for backward compat. Orphan cleanup checks both patterns.

3. **Messages as embedded array** in tickets — works well for the conversation thread pattern (typically < 50 messages per ticket). No need for a separate messages table at this scale.

4. **Date fields as ISO strings** (startDate, endDate, date) — Convex doesn't have a native Date type. String comparison works correctly for ISO format (YYYY-MM-DD) in B-tree indexes.

5. **`planData` as `v.any()`** — the AI output JSON schema is complex and evolving. Strict typing would create tight coupling between prompt engineering and database schema. Validated at the application layer instead.
