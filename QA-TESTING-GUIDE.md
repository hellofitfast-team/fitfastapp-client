# FitFast — Manual QA Testing Guide

> **Purpose:** Pre-handoff acceptance testing for both apps (Client PWA + Admin Panel).
> **Estimated time:** 4–6 hours for a full pass.
> **Last updated:** 2026-03-02

---

## Table of Contents

1. [Setup & Credentials](#1-setup--credentials)
2. [Client PWA Testing](#2-client-pwa-testing)
3. [Admin Panel Testing](#3-admin-panel-testing)
4. [Cross-App Flows](#4-cross-app-flows)
5. [Mobile & PWA Testing](#5-mobile--pwa-testing)
6. [Bilingual / RTL Testing](#6-bilingual--rtl-testing)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Issue Tracking Template](#8-issue-tracking-template)

---

## 1. Setup & Credentials

### Start the Apps

```bash
pnpm install
pnpm dev            # Both apps in parallel
# OR individually:
pnpm dev:client     # Client PWA → http://localhost:3000
pnpm dev:admin      # Admin Panel → http://localhost:3001
```

### Test Accounts

| Role   | Email                 | Password    | App         |
| ------ | --------------------- | ----------- | ----------- |
| Coach  | `testadmin@admin.com` | `test12345` | Admin Panel |
| Client | `client@fitfast.app`  | `test12345` | Client PWA  |

### Useful Seed Commands

```bash
# Re-seed test users (requires SEED_USER_PASSWORD env var on Convex)
npx convex run seedActions:seedTestUsers

# Reset client data (plans, check-ins, assessments)
npx convex run seed:resetClientData '{"email":"client@fitfast.app"}'

# Unlock check-in for testing (deletes check-ins/plans, keeps assessment)
npx convex run seed:unlockCheckIn '{"email":"client@fitfast.app"}'

# Create near-expiry user for testing expiry flows
npx convex run seed:populateNearExpiryUser

# Create expired user for testing expired state
npx convex run seed:populateExpiredUser
```

### Browser Setup

- Use Chrome or Edge (best PWA support)
- Open DevTools → Application tab → clear site data before a full test pass
- Enable mobile emulation (iPhone 14 Pro / Pixel 7) for responsive checks
- Test in both regular and incognito windows

---

## 2. Client PWA Testing

### 2.1 Authentication

#### Login Page (`/login`)

| #         | Scenario              | Steps                                                    | Expected Result                             |
| --------- | --------------------- | -------------------------------------------------------- | ------------------------------------------- |
| C-AUTH-01 | Valid login           | Enter `client@fitfast.app` / `test12345` → click Sign In | Redirect to dashboard `/`                   |
| C-AUTH-02 | Wrong password        | Enter valid email + wrong password → Sign In             | Error message shown, stays on login         |
| C-AUTH-03 | Empty fields          | Click Sign In with empty email or password               | Validation errors shown                     |
| C-AUTH-04 | Coach account blocked | Enter `testadmin@admin.com` / `test12345` in client app  | Error: coach accounts cannot sign in here   |
| C-AUTH-05 | Locale switcher       | Click English/العربية toggle on login page               | Page re-renders in selected language        |
| C-AUTH-06 | Session persistence   | Login → close tab → reopen `localhost:3000`              | Still authenticated, redirects to dashboard |
| C-AUTH-07 | Sign out              | Settings → Sign Out                                      | Redirect to `/login`, session cleared       |

#### Magic Link (`/magic-link`)

| #         | Scenario              | Steps                     | Expected Result               |
| --------- | --------------------- | ------------------------- | ----------------------------- |
| C-AUTH-08 | Magic link page loads | Navigate to `/magic-link` | Form renders with email input |

#### Accept Invite (`/accept-invite`)

| #         | Scenario      | Steps                                      | Expected Result     |
| --------- | ------------- | ------------------------------------------ | ------------------- |
| C-AUTH-09 | Invalid token | Navigate to `/accept-invite?token=invalid` | Error message shown |

---

### 2.2 Onboarding

#### Welcome Page (`/welcome`)

| #        | Scenario      | Steps                             | Expected Result                                                           |
| -------- | ------------- | --------------------------------- | ------------------------------------------------------------------------- |
| C-ONB-01 | Page loads    | Login as new user (no assessment) | Welcome page with feature cards + "Get Started" CTA                       |
| C-ONB-02 | Feature cards | Scroll through 4 feature cards    | Meal plans, workout plans, progress tracking, coach support cards visible |
| C-ONB-03 | Get Started   | Click "Get Started"               | Navigate to `/initial-assessment`                                         |

#### Initial Assessment (`/initial-assessment`)

| #        | Scenario          | Steps                                                                           | Expected Result                                  |
| -------- | ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| C-ONB-04 | Step 1: Goals     | Select primary goal + secondary focuses → Next                                  | Advances to Step 2, progress bar updates         |
| C-ONB-05 | Step 2: Body Info | Enter weight, height, age, gender, activity level, experience, equipment → Next | Advances to Step 3                               |
| C-ONB-06 | Step 3: Schedule  | Select workout days (min/max enforced), session duration, training time → Next  | Advances to Step 4                               |
| C-ONB-07 | Step 4: Dietary   | Select food preferences, meals/day, allergies, restrictions → Next              | Advances to Step 5                               |
| C-ONB-08 | Step 5: Medical   | Enter optional medical notes → Submit                                           | Overlay loader → redirect to dashboard           |
| C-ONB-09 | Step navigation   | Click Back on any step                                                          | Returns to previous step, data preserved         |
| C-ONB-10 | Swipe navigation  | Swipe left/right between steps (mobile emulation)                               | Steps transition smoothly                        |
| C-ONB-11 | Progress bar      | Complete each step                                                              | Progress bar fills proportionally (20% per step) |
| C-ONB-12 | Validation        | Skip required fields and try to advance                                         | Validation errors shown, cannot advance          |

#### Pending Page (`/pending`)

| #        | Scenario         | Steps                                        | Expected Result                |
| -------- | ---------------- | -------------------------------------------- | ------------------------------ |
| C-ONB-13 | Pending approval | Login as user with `pending_approval` status | Shows pending approval message |

---

### 2.3 Dashboard (`/`)

| #         | Scenario                    | Steps                                                | Expected Result                                                                 |
| --------- | --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| C-DASH-01 | Greeting section            | Load dashboard                                       | Shows current date, weekday, rotating motivational message                      |
| C-DASH-02 | Motivational rotation       | Wait 15+ seconds                                     | Message changes every ~5 seconds                                                |
| C-DASH-03 | Stats grid                  | View stats area                                      | Shows: overall progress %, meal progress, workout progress, days until check-in |
| C-DASH-04 | Mobile carousel             | View on mobile viewport (<768px)                     | 4-card auto-rotating carousel with dot indicators                               |
| C-DASH-05 | Desktop grid                | View on desktop viewport (≥768px)                    | 2×2 grid: Today's Stats, Meals, Workout, Plan Countdown                         |
| C-DASH-06 | Plan countdown              | Check countdown section                              | Shows current day / total days with progress bar                                |
| C-DASH-07 | Quick actions               | Verify "Submit Check-in" and "View Progress" buttons | Buttons navigate to correct pages                                               |
| C-DASH-08 | Coach message banner        | Have coach reply to a ticket                         | Banner appears with link to unread ticket                                       |
| C-DASH-09 | Banner dismiss              | Click dismiss on coach message banner                | Banner disappears                                                               |
| C-DASH-10 | Empty state (no plans)      | Reset client data → login                            | Shows "Plans generating..." spinner if assessment exists                        |
| C-DASH-11 | Empty state (no assessment) | Login as brand new user                              | Shows "Complete Assessment" CTA                                                 |
| C-DASH-12 | Expiry banner               | Login as near-expiry user (≤3 days remaining)        | Warning banner shows days remaining                                             |

---

### 2.4 Check-In Wizard (`/check-in`)

| #        | Scenario           | Steps                                                                              | Expected Result                                               |
| -------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| C-CHK-01 | Locked state       | Navigate to `/check-in` when locked                                                | Shows "Check-in Locked" with next date + countdown            |
| C-CHK-02 | Unlock for testing | Run `npx convex run seed:unlockCheckIn '{"email":"client@fitfast.app"}'` → refresh | Check-in form is available                                    |
| C-CHK-03 | Step 1: Weight     | Enter weight (required) + optional measurements → Next                             | Advances to Step 2                                            |
| C-CHK-04 | Weight pre-fill    | Open check-in after a previous check-in                                            | Weight field pre-filled from last check-in                    |
| C-CHK-05 | Step 2: Fitness    | Enter workout performance (min 10 chars), adjust energy + sleep sliders → Next     | Advances to Step 3                                            |
| C-CHK-06 | Step 3: Dietary    | Adjust dietary adherence slider, enter optional notes → Next                       | Advances to Step 4                                            |
| C-CHK-07 | Step 4: Photos     | Upload 1–4 progress photos (max 5MB each)                                          | Photos show preview thumbnails                                |
| C-CHK-08 | Photo remove       | Click remove on uploaded photo                                                     | Photo removed from list                                       |
| C-CHK-09 | Photo limit        | Try to upload 5+ photos                                                            | Only 4 accepted or upload blocked                             |
| C-CHK-10 | Photo too large    | Upload file >5MB                                                                   | Error message shown                                           |
| C-CHK-11 | Step 5: Review     | Review all entered data                                                            | Summary shows all fields correctly                            |
| C-CHK-12 | Submit             | Click Submit on review step                                                        | Overlay loader → AI plan generation starts → redirect to home |
| C-CHK-13 | Back navigation    | Click Back on any step                                                             | Returns to previous step with data preserved                  |
| C-CHK-14 | Rate limit         | Submit 3 check-ins in one day                                                      | 4th submission blocked with rate limit message                |

---

### 2.5 Meal Plan (`/meal-plan`)

| #         | Scenario                    | Steps                                        | Expected Result                                                 |
| --------- | --------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| C-MEAL-01 | Page loads                  | Navigate to Meal Plan                        | Day selector + today's meals displayed                          |
| C-MEAL-02 | Day selector                | Click different day numbers (1–14)           | Meals update for selected day                                   |
| C-MEAL-03 | Auto-select today           | Open meal plan page fresh                    | Today's day number is highlighted                               |
| C-MEAL-04 | Nutrition summary           | View daily summary                           | Calorie, protein, carbs, fat tags visible                       |
| C-MEAL-05 | Calorie explanation         | Look for info box                            | Calorie explanation text shown                                  |
| C-MEAL-06 | Meal card collapsed         | View meal cards                              | Shows meal name, first 3 ingredients, calorie count             |
| C-MEAL-07 | Meal card expanded          | Click/tap a meal card                        | Shows full macros, ingredients list, instructions, alternatives |
| C-MEAL-08 | Alternatives                | Expand a meal with alternatives              | Shows alternative count badge, expandable nested cards          |
| C-MEAL-09 | Alternative details         | Expand an alternative                        | Shows name, macros, ingredients, instructions                   |
| C-MEAL-10 | Streaming state             | Trigger new plan generation → view meal plan | Shows AI generation in real-time (streaming JSON)               |
| C-MEAL-11 | Empty state (no assessment) | View as user without assessment              | "Complete assessment" CTA shown                                 |
| C-MEAL-12 | Coach notes                 | If coach notes exist                         | Notes displayed at bottom of page                               |
| C-MEAL-13 | Horizontal scroll           | Scroll day selector on narrow viewport       | Smooth horizontal scrolling, RTL-aware                          |

---

### 2.6 Workout Plan (`/workout-plan`)

| #         | Scenario                | Steps                             | Expected Result                                             |
| --------- | ----------------------- | --------------------------------- | ----------------------------------------------------------- |
| C-WORK-01 | Page loads              | Navigate to Workout Plan          | Day selector + today's workout displayed                    |
| C-WORK-02 | Day selector            | Click different day numbers       | Workout updates for selected day                            |
| C-WORK-03 | Training split          | View split overview card          | Split name + description shown                              |
| C-WORK-04 | Rest day                | Select a rest day                 | Shows "Rest Day" notice with recovery message               |
| C-WORK-05 | Workout summary         | View summary card                 | Target muscles, exercise count, duration in 3-column layout |
| C-WORK-06 | Warmup section          | View warmup                       | List of warmup exercises with duration + instructions       |
| C-WORK-07 | Exercise card collapsed | View exercise cards               | Shows number, name, sets × reps                             |
| C-WORK-08 | Exercise card expanded  | Tap exercise card                 | Shows sets/reps/rest grid, equipment, notes, instructions   |
| C-WORK-09 | Cooldown section        | Scroll to bottom                  | Cooldown exercises listed                                   |
| C-WORK-10 | Progression notes       | Check bottom of page              | Coach guidance notes displayed                              |
| C-WORK-11 | Safety tips             | Check for warning alerts          | Safety tips with warning icon shown                         |
| C-WORK-12 | Streaming state         | After check-in, view workout plan | Shows streaming UI while generating                         |

---

### 2.7 Daily Tracking (`/tracking`)

| #          | Scenario         | Steps                                | Expected Result                                  |
| ---------- | ---------------- | ------------------------------------ | ------------------------------------------------ |
| C-TRACK-01 | Page loads       | Navigate to Tracking                 | Today's date selected, completion % shown        |
| C-TRACK-02 | Date picker      | Navigate to past/future dates        | Content updates for selected date                |
| C-TRACK-03 | Meal toggle      | Toggle a meal as completed           | Meal marked with checkmark, completion % updates |
| C-TRACK-04 | Meal untoggle    | Toggle completed meal again          | Meal unchecked, completion % decreases           |
| C-TRACK-05 | Meal notes       | Enter notes for a meal               | Notes saved (verify persistence on page reload)  |
| C-TRACK-06 | Workout toggle   | Toggle workout as completed          | Workout marked done, stats update                |
| C-TRACK-07 | Daily reflection | Enter text in reflection area → Save | Notes persist on page reload                     |
| C-TRACK-08 | Empty state      | View tracking with no active plans   | "No tracking data" message with CTA              |
| C-TRACK-09 | Real-time update | Toggle completion → check dashboard  | Dashboard stats reflect change immediately       |

---

### 2.8 Progress (`/progress`)

| #         | Scenario           | Steps                                     | Expected Result                                            |
| --------- | ------------------ | ----------------------------------------- | ---------------------------------------------------------- |
| C-PROG-01 | Page loads         | Navigate to Progress                      | Stats overview + Charts tab shown                          |
| C-PROG-02 | Date range filter  | Switch between 30 days, 90 days, All time | Charts and stats update for selected range                 |
| C-PROG-03 | Stats overview     | View stats section                        | Weight change (+ %), total check-ins, latest check-in date |
| C-PROG-04 | Weight chart       | View Charts tab                           | Interactive line chart showing weight over time            |
| C-PROG-05 | Measurements chart | Scroll in Charts tab                      | Measurements chart (chest, waist, hips, arms, thighs)      |
| C-PROG-06 | Photos tab         | Click Photos tab                          | Grid of progress photos grouped by date                    |
| C-PROG-07 | Photo viewer       | Click a progress photo                    | Lightbox/modal opens with full-size image                  |
| C-PROG-08 | History tab        | Click History tab                         | List of all check-ins with expandable details              |
| C-PROG-09 | No data            | View as user with zero check-ins          | Empty state with appropriate message                       |

---

### 2.9 Tickets (`/tickets`)

| #        | Scenario           | Steps                                                                   | Expected Result                                                  |
| -------- | ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C-TKT-01 | Create ticket      | Fill subject (≥3 chars), select category, optional description → Submit | Success toast, ticket appears in list                            |
| C-TKT-02 | Subject validation | Enter <3 chars subject → Submit                                         | Validation error shown                                           |
| C-TKT-03 | Category options   | Open category dropdown                                                  | Shows: meal_issue, workout_issue, technical, bug_report, other   |
| C-TKT-04 | Screenshot upload  | Attach screenshot (max 5MB image) → Submit                              | Screenshot included with ticket                                  |
| C-TKT-05 | Ticket list        | View existing tickets                                                   | Shows status icon, subject, status badge, last message, time ago |
| C-TKT-06 | Status colors      | Create tickets in various states                                        | Open (primary), coach_responded (emerald), closed (gray)         |
| C-TKT-07 | Empty state        | View with no tickets                                                    | "No tickets" message with create CTA                             |
| C-TKT-08 | Loading state      | Open tickets page                                                       | Skeleton loaders shown while fetching                            |
| C-TKT-09 | Relative time      | Check time display                                                      | Shows "5m ago", "Yesterday", "Jan 15" etc.                       |

#### Ticket Detail (`/tickets/[id]`)

| #        | Scenario          | Steps                                         | Expected Result                                             |
| -------- | ----------------- | --------------------------------------------- | ----------------------------------------------------------- |
| C-TKT-10 | View thread       | Click on a ticket                             | Shows subject, category, status + message thread            |
| C-TKT-11 | Message alignment | View thread with both client + coach messages | Coach messages left (gray), client messages right (primary) |
| C-TKT-12 | Date separators   | View thread spanning multiple days            | Date headers: "Today", "Yesterday", "Jan 15"                |
| C-TKT-13 | Reply             | Type message → Send (or press Enter)          | Message appears in thread, auto-scrolls to bottom           |
| C-TKT-14 | Shift+Enter       | Press Shift+Enter in reply box                | Adds newline instead of sending                             |
| C-TKT-15 | Closed ticket     | View a closed ticket                          | Reply box replaced with "Ticket is closed" notice           |
| C-TKT-16 | Auto-scroll       | Receive new message (coach replies via admin) | Thread scrolls to latest message                            |

---

### 2.10 FAQ (`/faq`)

| #        | Scenario          | Steps                         | Expected Result                      |
| -------- | ----------------- | ----------------------------- | ------------------------------------ |
| C-FAQ-01 | Page loads        | Navigate to FAQ               | List of expandable FAQ items         |
| C-FAQ-02 | Search            | Type in search bar            | FAQ list filters in real-time        |
| C-FAQ-03 | No results        | Search for gibberish text     | "No results" state shown             |
| C-FAQ-04 | Expand item       | Click a FAQ question          | Answer reveals with smooth animation |
| C-FAQ-05 | Collapse item     | Click expanded question again | Answer collapses                     |
| C-FAQ-06 | "Still Need Help" | Scroll to bottom              | CTA linking to `/tickets`            |

---

### 2.11 Settings (`/settings`)

| #        | Scenario                  | Steps                                        | Expected Result                                          |
| -------- | ------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| C-SET-01 | Profile card              | View settings                                | Email (read-only), name, phone, language fields visible  |
| C-SET-02 | Edit profile              | Change name or phone → Save                  | Success feedback, changes persist on reload              |
| C-SET-03 | Language switch           | Change language EN→AR (or vice versa) → Save | App re-renders in selected language + RTL layout         |
| C-SET-04 | Notifications toggle      | Enable notifications                         | Browser permission prompt (if first time)                |
| C-SET-05 | Notifications unsupported | View in browser without Notification API     | Warning message shown                                    |
| C-SET-06 | Plan details              | View Plan Details card                       | Shows tier, dates, status, days remaining + progress bar |
| C-SET-07 | No active plan            | View as user without plan                    | "No plan" message shown                                  |
| C-SET-08 | Sign out                  | Click Sign Out                               | Redirect to `/login`, session cleared                    |

---

## 3. Admin Panel Testing

### 3.1 Admin Authentication

#### Login Page (`localhost:3001/login`)

| #         | Scenario               | Steps                                               | Expected Result                   |
| --------- | ---------------------- | --------------------------------------------------- | --------------------------------- |
| A-AUTH-01 | Valid login            | Enter `testadmin@admin.com` / `test12345` → Sign In | Redirect to admin dashboard       |
| A-AUTH-02 | Wrong password         | Enter valid email + wrong password                  | Error message shown               |
| A-AUTH-03 | Client account blocked | Enter `client@fitfast.app` in admin login           | Error: not authorized / not coach |
| A-AUTH-04 | GSAP animation         | Load login page                                     | Smooth entrance animation on form |
| A-AUTH-05 | Auto-redirect          | Already logged in → navigate to `/login`            | Redirects to dashboard            |

---

### 3.2 Admin Dashboard (`/`)

| #         | Scenario              | Steps                      | Expected Result                                                       |
| --------- | --------------------- | -------------------------- | --------------------------------------------------------------------- |
| A-DASH-01 | Stat cards            | View dashboard             | 4 cards: Total clients, Active clients, Pending signups, Open tickets |
| A-DASH-02 | Stat links            | Click "Total clients" card | Navigates to `/clients`                                               |
| A-DASH-03 | Pending accent        | Have pending signups       | Pending card shows red accent                                         |
| A-DASH-04 | Tickets accent        | Have open tickets          | Tickets card shows red accent                                         |
| A-DASH-05 | Client growth chart   | View chart area            | Area chart: last 6 months of signups                                  |
| A-DASH-06 | Weekly activity chart | View chart area            | Bar chart: signups vs. tickets for last 4 weeks                       |
| A-DASH-07 | Quick actions         | View quick action cards    | Pending signups + open tickets previews                               |
| A-DASH-08 | GSAP animations       | Load dashboard             | Smooth entrance animations on cards and charts                        |

---

### 3.3 Clients Management (`/clients`)

| #        | Scenario      | Steps                                  | Expected Result                                             |
| -------- | ------------- | -------------------------------------- | ----------------------------------------------------------- |
| A-CLI-01 | Client list   | Navigate to Clients                    | Table with name, phone, status, plan tier, plan end date    |
| A-CLI-02 | Search        | Type client name/email/phone in search | List filters in real-time                                   |
| A-CLI-03 | Status badges | View different client statuses         | Colored badges: active, pending_approval, inactive, expired |
| A-CLI-04 | Pagination    | Navigate pages if >10 clients          | Page navigation works                                       |
| A-CLI-05 | Click client  | Click a client row                     | Navigate to `/clients/[id]` detail page                     |

#### Client Detail (`/clients/[id]`)

| #        | Scenario                | Steps                                                        | Expected Result                                            |
| -------- | ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| A-CLI-06 | Profile card            | View client detail                                           | Status, plan tier, phone, language displayed               |
| A-CLI-07 | Plan period             | View plan card                                               | Start date, end date, days remaining                       |
| A-CLI-08 | Assessment summary      | View assessment card                                         | Weight, height, experience, goals                          |
| A-CLI-09 | Payment history         | View payment section                                         | List of signup attempts with status, OCR data, screenshots |
| A-CLI-10 | View screenshot         | Click payment screenshot                                     | Full-size image opens                                      |
| A-CLI-11 | Activate pending client | On pending client → select plan tier → Activate              | Status changes to active, plan dates set                   |
| A-CLI-12 | Reject client           | On pending client → click Reject → enter reason              | Client rejected, data cascade-deleted                      |
| A-CLI-13 | Send notification       | On active client → click bell icon → enter title/body → Send | Notification sent, confirmation toast                      |
| A-CLI-14 | Notification limits     | Try title >50 chars or body >150 chars                       | Character limit enforced                                   |
| A-CLI-15 | Deactivate client       | On active/expired client → click Deactivate                  | Status changes to inactive                                 |

---

### 3.4 Pending Signups (`/signups`)

| #        | Scenario       | Steps                                         | Expected Result                                    |
| -------- | -------------- | --------------------------------------------- | -------------------------------------------------- |
| A-SIG-01 | Signups table  | Navigate to Signups                           | Table: name, email, phone, plan tier, date, status |
| A-SIG-02 | Status filter  | Switch between Pending/Approved/Rejected tabs | Table filters by status                            |
| A-SIG-03 | Default filter | Open signups page                             | Defaults to Pending filter                         |
| A-SIG-04 | Search         | Search by name/email/phone                    | Real-time filtering                                |
| A-SIG-05 | Pagination     | Navigate with many signups                    | Pagination works                                   |

#### Signup Detail (`/signups/[id]`)

| #        | Scenario           | Steps                                 | Expected Result                              |
| -------- | ------------------ | ------------------------------------- | -------------------------------------------- |
| A-SIG-06 | Signup info        | View signup detail                    | Name, email, phone, status, plan tier, dates |
| A-SIG-07 | Payment screenshot | View payment image                    | Displays image, clickable for full-size      |
| A-SIG-08 | OCR data           | View extracted data section           | Amount, sender, reference, date, bank shown  |
| A-SIG-09 | Approve signup     | Click Approve on pending signup       | Status → approved, invite sent               |
| A-SIG-10 | Reject signup      | Click Reject → enter reason → Confirm | Status → rejected, rejection email sent      |
| A-SIG-11 | Already actioned   | View approved/rejected signup         | Action buttons hidden                        |

---

### 3.5 Support Tickets (`/tickets`)

| #        | Scenario        | Steps                                     | Expected Result                                         |
| -------- | --------------- | ----------------------------------------- | ------------------------------------------------------- |
| A-TKT-01 | Tickets table   | Navigate to Tickets                       | Table: client name, subject, status, created date       |
| A-TKT-02 | Status icons    | View different ticket statuses            | Open (clock), coach_responded (message), closed (check) |
| A-TKT-03 | Expand ticket   | Click a ticket row                        | Conversation thread expands inline                      |
| A-TKT-04 | Reply to ticket | Type response → Send                      | Message added, status → coach_responded                 |
| A-TKT-05 | Empty reply     | Try to send empty response                | Send button disabled                                    |
| A-TKT-06 | Close ticket    | Click Close on open/responded ticket      | Status → closed                                         |
| A-TKT-07 | Closed ticket   | Expand a closed ticket                    | No reply textarea shown                                 |
| A-TKT-08 | Real-time       | Client sends message → view admin tickets | New message appears without refresh                     |
| A-TKT-09 | Nav badge       | Have open tickets                         | Red badge on Tickets nav item                           |

---

### 3.6 FAQ Manager (`/faqs`)

| #        | Scenario      | Steps                                      | Expected Result              |
| -------- | ------------- | ------------------------------------------ | ---------------------------- |
| A-FAQ-01 | Language tabs | View FAQ manager                           | English and Arabic tabs      |
| A-FAQ-02 | Create FAQ    | Click Add → enter question + answer → Save | New FAQ appears in list      |
| A-FAQ-03 | Edit FAQ      | Click edit on existing FAQ → modify → Save | Changes saved, list updates  |
| A-FAQ-04 | Delete FAQ    | Click delete → confirm                     | FAQ removed from list        |
| A-FAQ-05 | Arabic FAQs   | Switch to Arabic tab → add FAQ in Arabic   | Arabic FAQ saved and visible |
| A-FAQ-06 | Client sync   | Add FAQ → check client PWA `/faq`          | New FAQ appears on client    |

---

### 3.7 Knowledge Base (`/knowledge`)

#### Knowledge Tab

| #       | Scenario       | Steps                               | Expected Result                           |
| ------- | -------------- | ----------------------------------- | ----------------------------------------- |
| A-KB-01 | Add text entry | Enter title + content + tags → Save | Entry appears in list                     |
| A-KB-02 | Add PDF        | Upload PDF file → add tags          | PDF processed, entry appears with content |
| A-KB-03 | Search         | Type in search bar                  | Entries filter by title/content           |
| A-KB-04 | Edit entry     | Click edit → modify content → Save  | Changes saved                             |
| A-KB-05 | Delete entry   | Click delete → confirm              | Entry removed                             |
| A-KB-06 | Tag display    | View entries with tags              | Tags shown as chips/badges                |

#### Food Tab

| #       | Scenario    | Steps                                                    | Expected Result                                                     |
| ------- | ----------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| A-KB-07 | Add food    | Enter name + category + optional nutrition + tags → Save | Food appears in list                                                |
| A-KB-08 | Categories  | Open category selector                                   | Shows: Protein, Carb, Fat, Vegetable, Fruit, Dairy, Dessert, Recipe |
| A-KB-09 | Search food | Search by food name                                      | List filters in real-time                                           |
| A-KB-10 | Edit food   | Edit food entry → Save                                   | Changes saved                                                       |
| A-KB-11 | Delete food | Delete food → confirm                                    | Entry removed                                                       |

---

### 3.8 Notifications (`/notifications`)

| #        | Scenario         | Steps                                      | Expected Result                                             |
| -------- | ---------------- | ------------------------------------------ | ----------------------------------------------------------- |
| A-NOT-01 | Broadcast form   | View Notifications page                    | Title + body inputs with character counters                 |
| A-NOT-02 | Character limits | Enter title >50 or body >150 chars         | Counters show limit, form prevents over-limit               |
| A-NOT-03 | Send broadcast   | Enter title + body → Send to All → Confirm | Success toast with sent/failed count                        |
| A-NOT-04 | History table    | View notification history                  | Date, type, title, recipients, status                       |
| A-NOT-05 | History types    | Check type column                          | plan_ready, reminder, broadcast, individual                 |
| A-NOT-06 | Disabled banner  | Disable notifications in Settings → return | Banner shows "notifications disabled" with link to Settings |
| A-NOT-07 | Disabled form    | When notifications disabled                | Broadcast form is disabled                                  |
| A-NOT-08 | Pagination       | Many notification logs                     | Table paginates (10 per page)                               |

---

### 3.9 Settings (`/settings`)

| #        | Scenario            | Steps                                             | Expected Result                             |
| -------- | ------------------- | ------------------------------------------------- | ------------------------------------------- |
| A-SET-01 | Check-in frequency  | Change frequency (7–30 days) → Save               | Saved successfully, affects all clients     |
| A-SET-02 | Frequency bounds    | Try values <7 or >30                              | Validation prevents out-of-range            |
| A-SET-03 | Notification toggle | Toggle enable/disable                             | State saved, affects notification delivery  |
| A-SET-04 | Pricing plans       | View/edit monthly + quarterly prices → Save       | Prices saved                                |
| A-SET-05 | Payment methods     | Edit bank transfer + mobile wallet details → Save | Payment instructions saved                  |
| A-SET-06 | Social links        | Edit WhatsApp, Instagram, etc. → Save             | Links saved, visible on client app          |
| A-SET-07 | Save feedback       | Click Save                                        | Loading state ("Saving...") → success toast |

---

### 3.10 Navigation & Layout

| #        | Scenario         | Steps                           | Expected Result                                                                |
| -------- | ---------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| A-NAV-01 | Sidebar items    | Check sidebar                   | Dashboard, Signups, Clients, Tickets, FAQs, Knowledge, Notifications, Settings |
| A-NAV-02 | Signups badge    | Have pending signups            | Red badge count on Signups nav                                                 |
| A-NAV-03 | Tickets badge    | Have open tickets               | Red badge count on Tickets nav                                                 |
| A-NAV-04 | Active highlight | Navigate between pages          | Current page highlighted in sidebar                                            |
| A-NAV-05 | Locale switcher  | Switch language in admin header | Admin panel re-renders in selected language                                    |
| A-NAV-06 | Coach name       | View admin header               | Coach name displayed                                                           |
| A-NAV-07 | Sign out         | Click user menu → Sign Out      | Redirect to admin login                                                        |

---

## 4. Cross-App Flows

These scenarios span **both** apps and test end-to-end workflows.

### 4.1 New Client Signup → Activation

| #     | Step             | App     | Action                                          | Expected                                       |
| ----- | ---------------- | ------- | ----------------------------------------------- | ---------------------------------------------- |
| X-01a | Signup submitted | Client  | New user submits signup with payment screenshot | Signup created with "pending" status           |
| X-01b | OCR extraction   | Backend | Automatic                                       | Payment data extracted (amount, sender, ref #) |
| X-01c | Coach reviews    | Admin   | Navigate to Signups → click new signup          | OCR data + screenshot visible                  |
| X-01d | Coach approves   | Admin   | Select plan tier → Approve                      | Invite email sent                              |
| X-01e | Client accepts   | Client  | Open invite link from email                     | Accept invite page → set password              |
| X-01f | Client onboards  | Client  | Complete assessment (5 steps)                   | Plans start generating                         |
| X-01g | Plans ready      | Client  | Wait for AI completion                          | Meal + workout plans visible on dashboard      |

### 4.2 Check-In → Plan Regeneration

| #     | Step            | App    | Action                                        | Expected                                |
| ----- | --------------- | ------ | --------------------------------------------- | --------------------------------------- |
| X-02a | Unlock          | CLI    | `npx convex run seed:unlockCheckIn ...`       | Check-in unlocked                       |
| X-02b | Submit check-in | Client | Complete 5-step check-in with weight + photos | Overlay → redirect to dashboard         |
| X-02c | Plans generate  | Client | View meal plan / workout plan                 | Streaming UI → new plans appear         |
| X-02d | Notification    | Client | Check push notifications                      | "Your new plans are ready" notification |
| X-02e | Check-in lock   | Client | Try to check-in again                         | "Check-in Locked" with next date        |

### 4.3 Ticket Conversation

| #     | Step               | App    | Action                               | Expected                                    |
| ----- | ------------------ | ------ | ------------------------------------ | ------------------------------------------- |
| X-03a | Create             | Client | Create ticket (meal_issue category)  | Ticket created with "open" status           |
| X-03b | Coach sees         | Admin  | Navigate to Tickets                  | New ticket visible in list                  |
| X-03c | Coach replies      | Admin  | Expand ticket → type response → Send | Status → coach_responded                    |
| X-03d | Client notified    | Client | Check dashboard                      | Coach message banner appears                |
| X-03e | Client reads       | Client | Navigate to ticket                   | Coach response visible in thread            |
| X-03f | Client replies     | Client | Type reply → Send                    | Message appears in thread                   |
| X-03g | Coach sees reply   | Admin  | Refresh tickets                      | Client reply visible                        |
| X-03h | Close ticket       | Admin  | Click Close on ticket                | Status → closed                             |
| X-03i | Client sees closed | Client | View ticket                          | "Ticket is closed" notice, reply box hidden |

### 4.4 FAQ Management

| #     | Step           | App    | Action                                   | Expected                |
| ----- | -------------- | ------ | ---------------------------------------- | ----------------------- |
| X-04a | Add FAQ        | Admin  | FAQs → Add new FAQ (English)             | FAQ created             |
| X-04b | Client sees    | Client | Navigate to `/faq`                       | New FAQ appears in list |
| X-04c | Add Arabic FAQ | Admin  | Switch to Arabic tab → Add FAQ in Arabic | Arabic FAQ created      |
| X-04d | Client sees AR | Client | Switch to Arabic → view FAQ              | Arabic FAQ visible      |

### 4.5 Client Deactivation / Expiry

| #     | Step             | App     | Action                              | Expected                          |
| ----- | ---------------- | ------- | ----------------------------------- | --------------------------------- |
| X-05a | Deactivate       | Admin   | Clients → click client → Deactivate | Status → inactive                 |
| X-05b | Client blocked   | Client  | Try to access dashboard             | Error/redirect — inactive account |
| X-05c | Expiry           | Backend | Create expired user via seed        | User has expired plan             |
| X-05d | Expired redirect | Client  | Login as expired user               | Redirects to `/expired` page      |

### 4.6 Settings Propagation

| #     | Step             | App    | Action                                                | Expected                   |
| ----- | ---------------- | ------ | ----------------------------------------------------- | -------------------------- |
| X-06a | Change frequency | Admin  | Settings → change check-in frequency to 7 days → Save | Saved                      |
| X-06b | Client sees      | Client | View check-in lock status                             | Shows 7-day cycle (not 14) |
| X-06c | Social links     | Admin  | Settings → add WhatsApp link → Save                   | Saved                      |
| X-06d | Client sees      | Client | Check support/contact area                            | WhatsApp link visible      |

---

## 5. Mobile & PWA Testing

### 5.1 Responsive Design

| #        | Scenario            | Steps                            | Expected Result                                      |
| -------- | ------------------- | -------------------------------- | ---------------------------------------------------- |
| M-RES-01 | Mobile viewport     | Set viewport to 375×812 (iPhone) | All pages render correctly, no horizontal scroll     |
| M-RES-02 | Tablet viewport     | Set viewport to 768×1024 (iPad)  | Layout adapts (some 2-column grids)                  |
| M-RES-03 | Desktop viewport    | Full desktop width (1440px+)     | Full layout with sidebar/desktop nav                 |
| M-RES-04 | Bottom nav (mobile) | View client app on mobile        | Bottom navigation: Home, Tracking, Tickets, Settings |
| M-RES-05 | Top nav (desktop)   | View client app on desktop       | Top navigation bar                                   |
| M-RES-06 | Touch targets       | Tap all buttons on mobile        | All interactive elements are ≥44px tap targets       |

### 5.2 PWA Install

| #        | Scenario        | Steps                            | Expected Result                         |
| -------- | --------------- | -------------------------------- | --------------------------------------- |
| M-PWA-01 | Install prompt  | Open client PWA on mobile Chrome | Install banner/prompt appears           |
| M-PWA-02 | Add to home     | Accept install prompt            | App icon added to home screen           |
| M-PWA-03 | Standalone mode | Open from home screen icon       | App runs fullscreen (no browser chrome) |
| M-PWA-04 | iOS install     | Open on Safari iOS               | Manual install instructions shown       |

### 5.3 Push Notifications

| #         | Scenario                | Steps                            | Expected Result                          |
| --------- | ----------------------- | -------------------------------- | ---------------------------------------- |
| M-PUSH-01 | Permission prompt       | Enable notifications in Settings | Browser permission dialog appears        |
| M-PUSH-02 | Grant permission        | Click Allow                      | Subscription saved, toggle shows enabled |
| M-PUSH-03 | Receive notification    | Coach sends broadcast via admin  | Push notification appears                |
| M-PUSH-04 | Plan ready notification | Submit check-in → wait for plans | "Plans ready" push notification          |
| M-PUSH-05 | Deny permission         | Click Block on permission        | Warning shown, toggle disabled           |

### 5.4 Service Worker

| #       | Scenario          | Steps                                         | Expected Result                          |
| ------- | ----------------- | --------------------------------------------- | ---------------------------------------- |
| M-SW-01 | Registration      | Open DevTools → Application → Service Workers | SW registered and active                 |
| M-SW-02 | Offline indicator | Disconnect network (DevTools → offline)       | App shows offline state (not blank page) |

---

## 6. Bilingual / RTL Testing

### 6.1 Language Switching

| #         | Scenario          | Steps                                | Expected Result                       |
| --------- | ----------------- | ------------------------------------ | ------------------------------------- |
| L-LANG-01 | Switch to Arabic  | Settings → Language → العربية → Save | Entire app renders in Arabic          |
| L-LANG-02 | Switch to English | Settings → Language → English → Save | Entire app renders in English         |
| L-LANG-03 | URL locale        | Check browser URL after switch       | URL changes to `/ar/...` or `/en/...` |
| L-LANG-04 | Persist on reload | Switch language → refresh page       | Language persists                     |

### 6.2 RTL Layout (Arabic)

| #        | Scenario        | Steps                                         | Expected Result                                                    |
| -------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| L-RTL-01 | Text direction  | Switch to Arabic → check text                 | All text is right-to-left                                          |
| L-RTL-02 | Navigation      | Check sidebar/bottom nav in Arabic            | Nav items align to right                                           |
| L-RTL-03 | Form labels     | View any form in Arabic                       | Labels right-aligned, inputs RTL                                   |
| L-RTL-04 | Ticket messages | View ticket thread in Arabic                  | Client messages still right, coach still left (or flipped per RTL) |
| L-RTL-05 | Day selector    | View meal/workout plan day selector in Arabic | Scrolls correctly in RTL                                           |
| L-RTL-06 | Swipe direction | Swipe assessment steps in Arabic              | Swipe direction is reversed (RTL-aware)                            |
| L-RTL-07 | Charts          | View Progress charts in Arabic                | Charts render correctly (labels, axes)                             |
| L-RTL-08 | Numbers         | Check numeric values in Arabic                | Eastern Arabic digits (٠١٢...) where appropriate                   |

### 6.3 Content Completeness

| #         | Scenario           | Steps                                       | Expected Result                                                        |
| --------- | ------------------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| L-CONT-01 | No missing keys    | Browse every page in Arabic                 | No English fallback text or i18n key strings (`namespace.key`) visible |
| L-CONT-02 | AI plans in Arabic | Submit check-in with language set to Arabic | Generated meal + workout plans are in Arabic                           |
| L-CONT-03 | Admin in Arabic    | Switch admin panel to Arabic                | All admin pages render in Arabic                                       |
| L-CONT-04 | FAQ bilingual      | Check FAQs in both languages                | Each language shows language-specific FAQs                             |
| L-CONT-05 | Error messages     | Trigger validation errors in Arabic         | Error messages are in Arabic                                           |

---

## 7. Edge Cases & Error Handling

### 7.1 Authentication Edge Cases

| #         | Scenario                 | Steps                                                  | Expected Result                            |
| --------- | ------------------------ | ------------------------------------------------------ | ------------------------------------------ |
| E-AUTH-01 | Expired session          | Wait for session to expire → interact                  | Redirected to login gracefully             |
| E-AUTH-02 | Multiple tabs            | Login in Tab A → sign out in Tab B → interact in Tab A | Tab A redirects to login                   |
| E-AUTH-03 | Direct URL (protected)   | Enter `localhost:3000/en/meal-plan` without login      | Redirected to login                        |
| E-AUTH-04 | Direct URL (after login) | Login → should redirect to originally requested page   | Redirected to intended page (or dashboard) |

### 7.2 Form Validation

| #         | Scenario                   | Steps                                                     | Expected Result                  |
| --------- | -------------------------- | --------------------------------------------------------- | -------------------------------- |
| E-FORM-01 | Assessment required fields | Skip required fields in assessment                        | Cannot proceed to next step      |
| E-FORM-02 | Check-in weight required   | Submit check-in without weight                            | Validation error on weight field |
| E-FORM-03 | Check-in performance min   | Enter <10 chars for workout performance                   | Validation error shown           |
| E-FORM-04 | Ticket subject length      | Enter subject <3 or >100 chars                            | Validation prevents submission   |
| E-FORM-05 | Photo file type            | Upload non-image file as progress photo                   | Rejected with error message      |
| E-FORM-06 | Photo file size            | Upload image >5MB                                         | Rejected with size error         |
| E-FORM-07 | Special characters         | Enter special characters (إ, é, 你, emoji) in text fields | Handled correctly, no corruption |

### 7.3 Empty & Loading States

| #          | Scenario              | Steps                                      | Expected Result                          |
| ---------- | --------------------- | ------------------------------------------ | ---------------------------------------- |
| E-STATE-01 | Dashboard no plans    | Reset client data → view dashboard         | Appropriate empty state with CTA         |
| E-STATE-02 | Meal plan empty       | View meal plan before generation completes | Streaming UI or "generating" state       |
| E-STATE-03 | Progress no check-ins | View progress with zero check-ins          | Empty state with guidance                |
| E-STATE-04 | Tracking no plans     | View tracking without active plans         | Empty state with CTA                     |
| E-STATE-05 | Tickets empty         | View tickets with no tickets               | Empty state with create CTA              |
| E-STATE-06 | Admin no clients      | View admin clients with zero clients       | Empty table state                        |
| E-STATE-07 | Loading skeletons     | Navigate between pages quickly             | Skeleton loaders shown (not blank pages) |

### 7.4 Network & Error States

| #        | Scenario          | Steps                                            | Expected Result                                |
| -------- | ----------------- | ------------------------------------------------ | ---------------------------------------------- |
| E-NET-01 | Slow connection   | DevTools → throttle to Slow 3G → submit check-in | Loading states shown, no duplicate submissions |
| E-NET-02 | Convex reconnect  | Disconnect network briefly → reconnect           | App recovers, data syncs via WebSocket         |
| E-NET-03 | API error         | (If testable) Trigger API failure                | Error message shown, app doesn't crash         |
| E-NET-04 | Large file upload | Upload 4.9MB photo (near limit)                  | Upload succeeds with progress indication       |

### 7.5 Plan Expiry & Account States

| #         | Scenario           | Steps                                | Expected Result                            |
| --------- | ------------------ | ------------------------------------ | ------------------------------------------ |
| E-PLAN-01 | Near-expiry banner | Login as user with ≤3 days remaining | Expiry warning banner visible on dashboard |
| E-PLAN-02 | Expired redirect   | Login as expired user                | Redirects to `/expired` page               |
| E-PLAN-03 | Inactive account   | Login as inactive user               | Error message, cannot access dashboard     |
| E-PLAN-04 | Pending approval   | Login as pending user                | Redirects to `/pending` page               |

### 7.6 Concurrent Actions

| #         | Scenario      | Steps                                           | Expected Result                                               |
| --------- | ------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| E-CONC-01 | Double submit | Rapidly click Submit twice on check-in          | Only one check-in created (button disabled after first click) |
| E-CONC-02 | Rapid toggles | Rapidly toggle meal completions                 | All toggles register correctly (no race conditions)           |
| E-CONC-03 | Two browsers  | Open same account in 2 browsers → toggle in one | Other browser updates in real-time (Convex WebSocket)         |

---

## 8. Issue Tracking Template

When you find a bug during testing, document it using this template:

```markdown
### Bug: [Short description]

- **ID:** QA-[number]
- **Severity:** Critical / High / Medium / Low
- **Scenario ID:** [e.g., C-DASH-04]
- **App:** Client / Admin / Both
- **Page:** [URL path]
- **Language:** EN / AR / Both
- **Viewport:** Mobile / Desktop / Both
- **Browser:** Chrome / Safari / Edge / Firefox

**Steps to Reproduce:**

1. ...
2. ...
3. ...

**Expected:** [What should happen]
**Actual:** [What actually happened]

**Screenshot/Video:** [Attach if possible]

**Notes:** [Any additional context]
```

### Severity Definitions

| Severity     | Definition                                        | Example                                              |
| ------------ | ------------------------------------------------- | ---------------------------------------------------- |
| **Critical** | App crashes, data loss, cannot complete core flow | Check-in submission fails silently, auth broken      |
| **High**     | Feature broken but workaround exists              | Meal plan doesn't load on Day 7, but other days work |
| **Medium**   | UI issue or minor feature broken                  | Misaligned text, wrong color, tooltip not showing    |
| **Low**      | Cosmetic or enhancement                           | Font size slightly off, animation jitter             |

---

## Quick Reference: Test Account Reset

If the test client gets into a broken state, reset with:

```bash
# Nuclear reset — deletes all client data and re-creates clean state
npx convex run seed:resetClientData '{"email":"client@fitfast.app"}'

# Just unlock check-in (preserves assessment, deletes plans + check-ins)
npx convex run seed:unlockCheckIn '{"email":"client@fitfast.app"}'

# Full user re-seed (both coach + client)
npx convex run seedActions:seedTestUsers
```

---

**Total scenarios:** ~200+
**Recommended approach:** Work through sections sequentially. Complete all Client tests first, then Admin, then Cross-App flows. Save Mobile/PWA and Bilingual for dedicated passes.
