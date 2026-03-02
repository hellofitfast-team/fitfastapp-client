# FitFast Operations Guide

Day-to-day operations, maintenance, troubleshooting, and monitoring for the FitFast platform.

---

## Table of Contents

1. [Seeding Initial Data](#seeding-initial-data)
2. [Resetting Client Data](#resetting-client-data)
3. [Data Retention](#data-retention)
4. [Monitoring](#monitoring)
5. [Common Troubleshooting](#common-troubleshooting)
6. [Backup and Recovery](#backup-and-recovery)
7. [Scaling](#scaling)

---

## Seeding Initial Data

### Seed Test Users

To create test users for development or demo purposes:

```bash
# Ensure SEED_USER_PASSWORD is set in Convex environment
npx convex env set SEED_USER_PASSWORD "your-test-password"

# Run the seed action
npx convex run seedActions:seedTestUsers
```

This creates:

- **Coach account**: `testadmin@admin.com` / `<SEED_USER_PASSWORD>`
- **Client account**: `client@fitfast.app` / `<SEED_USER_PASSWORD>`

The coach account has `isCoach: true` in its profile, which grants admin panel access.

### Seed System Config

If starting fresh, you may need to set default system configuration:

```bash
# Set default check-in frequency (14 days)
npx convex run systemConfig:setConfig '{"key":"check_in_frequency_days","value":14}'
```

Plans, payment methods, and social links can be configured through the admin panel UI after login.

---

## Resetting Client Data

To reset a specific client's data (useful for testing or re-onboarding):

```bash
npx convex run seed:resetClientData '{"email":"client@fitfast.app"}'
```

This removes:

- Check-ins
- Meal plans and workout plans
- Meal/workout completions
- Daily reflections
- Assessment data

The profile itself is preserved, so the client can log in and re-complete the initial assessment.

---

## Data Retention

### Automated Cleanup

FitFast has a built-in data retention system that automatically purges data for inactive users:

- **Retention period**: 90 days after a client becomes inactive or their subscription expires
- **Trigger**: The `dataRetention.runRetentionCleanup` internal action runs periodically
- **Scope**: Cascade-deletes all user data including:
  - Profile
  - Assessments and assessment history
  - Check-ins
  - Meal/workout plans and completions
  - Daily reflections
  - Tickets
  - Push subscriptions
  - File uploads (progress photos, screenshots)
  - File metadata

### Manual Cleanup

To trigger retention cleanup manually:

```bash
npx convex run dataRetention:runRetentionCleanup
```

### How It Works

1. Finds all profiles with `status: "inactive"` or `status: "expired"` where `inactiveSince` is older than 90 days.
2. For each expired user, cascade-deletes all their data across all tables.
3. Failures are logged but do not stop the process for other users.

---

## Monitoring

### Convex Dashboard

Access the Convex dashboard at https://dashboard.convex.dev:

#### Key Metrics to Watch

- **Function Performance**: Check execution time for AI-related actions (`ai.generateMealPlan`, `ai.generateWorkoutPlan`). These should complete within 30-60 seconds.
- **Function Errors**: Look for failed mutations/actions, especially in `checkIns`, `pendingSignups`, and `ai` modules.
- **Database Size**: Monitor table row counts for `mealPlans`, `workoutPlans`, and `checkIns`.
- **Storage Usage**: Monitor file storage for progress photos and payment screenshots.

#### Useful Queries in Convex Dashboard

- View all pending signups: Query `pendingSignups` table filtered by `status = "pending"`
- Check active client count: Query `profiles` table filtered by `status = "active"` and `isCoach = false`
- View recent AI failures: Check logs for `ai.generateMealPlan` and `ai.generateWorkoutPlan` functions

### Sentry

Access Sentry at https://sentry.io:

#### Alert Setup (Recommended)

| Alert Rule   | Condition                         | Action                     |
| ------------ | --------------------------------- | -------------------------- |
| New Issue    | First occurrence of any new error | Email notification         |
| High Volume  | More than 10 events in 1 hour     | Email + Slack notification |
| AI Failures  | Tag `feature:check-in-submission` | Email notification         |
| Admin Errors | Tag `panel:admin`                 | Email notification         |

#### Key Error Tags

FitFast tags errors with contextual information:

| Tag         | Values                                        | Description        |
| ----------- | --------------------------------------------- | ------------------ |
| `feature`   | `check-in-submission`, `admin-settings`, etc. | Which feature area |
| `panel`     | `admin`, `client`                             | Which app          |
| `operation` | `update-config`, `approve-signup`, etc.       | Specific operation |

### Vercel

Access Vercel at https://vercel.com:

- **Deployment Logs**: Check build logs if a deployment fails.
- **Runtime Logs**: View server-side logs for API routes.
- **Analytics** (if enabled): Page views, Core Web Vitals, traffic patterns.
- **Speed Insights**: Monitor real user performance metrics.

---

## Common Troubleshooting

### Login Issues

| Symptom                        | Likely Cause                | Fix                                                              |
| ------------------------------ | --------------------------- | ---------------------------------------------------------------- |
| "Not authenticated" error      | Convex Auth session expired | Check Convex Auth configuration and session handling             |
| Login page loops back          | Middleware misconfiguration | Check `apps/client/middleware.ts` and `apps/admin/middleware.ts` |
| Coach can't access admin panel | Profile not marked as coach | In Convex, check the profile has `isCoach: true`                 |

### AI Plan Generation Failures

| Symptom                             | Likely Cause                          | Fix                                                                      |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Plans not generated after check-in  | OpenRouter API key invalid or expired | Verify `OPENROUTER_API_KEY` in Convex env                                |
| "Rate limit exceeded" errors        | Too many concurrent requests          | OpenRouter has rate limits; plans retry up to 3 times automatically      |
| Plans generated but empty/malformed | Model output parsing failure          | Check Sentry for the specific error; may need to update prompt templates |
| Plans take too long (>60s)          | Model latency or queue                | Normal during high traffic; Convex actions have a 10-minute timeout      |

### Push Notification Issues

| Symptom                           | Likely Cause            | Fix                                                             |
| --------------------------------- | ----------------------- | --------------------------------------------------------------- |
| No notification permission prompt | VAPID key not set       | Verify `VAPID_PUBLIC_KEY` is set in Convex env                  |
| Notifications don't arrive        | VAPID private key wrong | Verify `VAPID_PRIVATE_KEY` in Convex env matches the public key |
| Service worker error              | SW not registered       | Ensure `public/sw.js` exists and is served with correct headers |
| iOS doesn't show notifications    | PWA not installed       | iOS requires the PWA to be added to home screen for Web Push    |

### Payment Verification Issues

| Symptom                 | Likely Cause            | Fix                                                 |
| ----------------------- | ----------------------- | --------------------------------------------------- |
| OCR not extracting data | Image quality too low   | Client should upload a clearer screenshot           |
| OCR shows wrong values  | AI model misread text   | Coach should manually verify against the screenshot |
| No screenshot uploaded  | Client skipped the step | Contact client to resubmit with payment proof       |

### Check-In Not Appearing

| Symptom                            | Likely Cause                           | Fix                                                              |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| "Check-in locked" message          | Within the check-in frequency window   | Normal behavior -- client must wait until the next check-in date |
| Lock shows wrong date              | `check_in_frequency_days` config issue | Verify the setting in admin Settings page                        |
| Check-in submitted but no new plan | AI generation failed                   | Check Sentry for errors tagged `feature:check-in-submission`     |

### Email Issues

| Symptom                    | Likely Cause                      | Fix                                                    |
| -------------------------- | --------------------------------- | ------------------------------------------------------ |
| Invitation emails not sent | Resend API key invalid            | Verify `RESEND_API_KEY` in Convex env                  |
| Emails going to spam       | Domain not verified               | Complete Resend domain verification (SPF, DKIM, DMARC) |
| Wrong sender address       | `RESEND_FROM_EMAIL` misconfigured | Must match a verified domain in Resend                 |

---

## Backup and Recovery

### Convex Data Export

Convex provides data export functionality through the dashboard:

1. Go to https://dashboard.convex.dev
2. Select your project
3. Navigate to **Data** > **Export**
4. Download a snapshot of all tables

### Important Notes

- Convex stores data durably with automatic replication.
- File storage (progress photos, PDFs) is stored in Convex's built-in storage system.
- There is no manual "restore from backup" in Convex -- contact Convex support for disaster recovery.

### What to Back Up Externally

- Environment variables (keep a secure copy of all API keys)
- User data (stored in Convex, included in Convex backups)
- Custom knowledge base content (consider periodic exports)

### Recovery Scenarios

| Scenario                   | Recovery Approach                                           |
| -------------------------- | ----------------------------------------------------------- |
| Accidental client deletion | Re-create the profile; data is gone after retention cleanup |
| Convex deployment issue    | Redeploy with `npx convex deploy`                           |
| Corrupted system config    | Reset via Convex dashboard or CLI mutation                  |
| Lost API keys              | Regenerate from respective service dashboards               |

---

## Scaling

### Current Capacity

FitFast is designed for **500-1000 clients per coach instance**:

| Resource           | Capacity                | Notes                              |
| ------------------ | ----------------------- | ---------------------------------- |
| Convex database    | No hard limit           | Convex scales automatically        |
| AI plan generation | ~50 concurrent          | Limited by OpenRouter rate limits  |
| Push notifications | Unlimited               | Native Web Push — no vendor limits |
| Email sending      | 3000/day (Resend free)  | Upgrade plan for higher volume     |
| File storage       | Scales with Convex plan | Monitor storage usage              |

### When to Upgrade

| Signal                              | Action                                         |
| ----------------------------------- | ---------------------------------------------- |
| AI generation queue building up     | Upgrade OpenRouter plan or add retry logic     |
| Email delivery failures             | Upgrade Resend plan                            |
| Convex function timeouts increasing | Review function performance; contact Convex    |
| >1000 active clients                | Review Convex plan limits; consider Convex Pro |
| Sentry event quota exceeded         | Upgrade Sentry plan or increase sampling rate  |

### Performance Tips

- Monitor Convex function execution times in the dashboard.
- AI plans are the most resource-intensive operation -- they run only on check-in submission (not proactively).
- Knowledge base entries and food database items are cached by Convex's reactive query system.
- File uploads (progress photos) are limited to 4 per check-in, max 5MB each.
