# FitFast Demo Script

Step-by-step walkthrough for demonstrating FitFast to a prospective coach buyer. Total demo time: approximately 20 minutes.

---

## Pre-Demo Setup

### 1. Verify Services Are Running

- [ ] Client app loads at the expected URL
- [ ] Admin panel loads at the expected URL
- [ ] Convex dashboard shows healthy status (no function errors)

### 2. Seed Test Users

If test users do not exist, seed them:

```bash
npx convex run seedActions:seedTestUsers
```

### 3. Reset Demo Client Data (Optional)

For a clean demo experience, reset the demo client:

```bash
npx convex run seed:resetClientData '{"email":"client@fitfast.app"}'
```

Then log in as the client and complete the initial assessment before the demo so that AI-generated plans are available.

### 4. Prepare Browser Tabs

Open these tabs in advance:

1. **Tab 1**: Client app login page (`https://app.yourdomain.com`)
2. **Tab 2**: Admin panel login page (`https://admin.yourdomain.com`)
3. **Tab 3**: (Optional) Convex dashboard for showing real-time data

### Demo Credentials

| Role   | Email                 | Password    |
| ------ | --------------------- | ----------- |
| Coach  | `testadmin@admin.com` | `test12345` |
| Client | `client@fitfast.app`  | `test12345` |

---

## Demo Flow -- Client Journey (~10 minutes)

### Step 1: Login Page

1. Navigate to the client app.
2. **Show**: Clean, bilingual login page with language switcher.
3. **Say**: "Clients access the app through this simple login page. It supports both English and Arabic."
4. Log in as the demo client.

### Step 2: Dashboard

1. **Show**: The dashboard with motivational greeting, stat widgets, today's meals/workout, plan countdown.
2. **Point out**:
   - Personalized greeting with the client's first name
   - Today's progress percentage
   - Meal and workout completion status
   - Countdown to next check-in
   - Plan progress bar (e.g., "Day 5 of 14")
3. **Say**: "The dashboard gives clients an at-a-glance view of everything they need for the day."

### Step 3: Meal Plan

1. Navigate to **Meal Plan** from bottom navigation.
2. **Show**: AI-generated meal plan with day selector at the top.
3. **Point out**:
   - Day-by-day navigation
   - Individual meals with names, calories, macros
   - Detailed ingredient lists and portions
4. **Say**: "Every meal plan is AI-generated based on the client's assessment, preferences, allergies, and goals. It uses your coaching knowledge to create plans that feel personal."

### Step 4: Workout Plan

1. Navigate to **Workout Plan**.
2. **Show**: AI-generated workout plan with exercises, sets, reps.
3. **Point out**:
   - Day-by-day split
   - Exercise details (sets, reps, rest periods)
   - Rest days clearly marked
   - Workout duration estimates
4. **Say**: "Workout plans consider the client's experience level, equipment access, schedule, and any injuries."

### Step 5: Daily Tracking

1. Navigate to **Tracking**.
2. **Show**: The tracking page with meal and workout check-off.
3. **Point out**:
   - Individual meal completion toggles
   - Workout completion tracking
   - Daily reflection journal
   - Date progress indicator
4. **Say**: "Clients track their daily adherence, which feeds back into the AI's next plan generation."

### Step 6: Progress

1. Navigate to **Progress**.
2. **Show**: Charts, measurement history, progress photos.
3. **Point out**:
   - Weight trend chart over time
   - Measurement history (chest, waist, hips, arms, thighs)
   - Photo comparisons (if available)
   - Check-in history tab
4. **Say**: "Both you and your clients can see clear progress over time."

### Step 7: Check-In Wizard (Show but don't submit)

1. Navigate to **Check-In**.
2. **Show**: The multi-step check-in wizard.
3. Walk through each step briefly:
   - **Step 1**: Weight and body measurements
   - **Step 2**: Workout performance, energy, and sleep ratings
   - **Step 3**: Dietary adherence rating
   - **Step 4**: Progress photos (up to 4)
   - **Step 5**: Review and submit
4. **Demonstrate**: Swipe navigation between steps (on mobile).
5. **Say**: "Every check-in cycle, clients submit this data. The AI then generates completely new meal and workout plans based on their progress."
6. **Do not submit** -- go back to preserve demo data.

### Step 8: Support Tickets

1. Navigate to **Tickets** (from bottom nav or more menu).
2. **Show**: The ticket list and create ticket flow.
3. **Say**: "Clients communicate with you through tickets. No real-time chat needed -- they submit issues and you respond from the admin panel."

### Step 9: Language Switching

1. Open the settings or language switcher.
2. Switch from English to Arabic.
3. **Show**: The entire UI flips to right-to-left layout.
4. **Say**: "Full Arabic support with proper RTL layout. AI also generates plans in Arabic."
5. Switch back to English.

---

## Demo Flow -- Admin Journey (~10 minutes)

### Step 1: Admin Dashboard

1. Switch to the admin panel tab.
2. Log in as the coach.
3. **Show**: Dashboard with stat cards and charts.
4. **Point out**:
   - Total clients, active clients, pending signups, open tickets
   - Client growth chart (last 6 months)
   - Weekly activity chart (signups vs. tickets)
   - Quick action panels for pending items
5. **Say**: "Your dashboard gives you a complete overview of your coaching business at a glance."

### Step 2: Pending Signups

1. Navigate to **Signups**.
2. **Show**: The signups table.
3. **Point out**:
   - Client name, email, phone
   - Selected plan tier
   - Payment proof (click the Payment button to expand)
   - OCR-extracted payment data (amount, sender, reference number, bank)
4. **Demonstrate**: Expand a payment screenshot and show the zoom feature.
5. **Say**: "When a new client signs up, they upload payment proof. AI extracts the payment details for you to verify, and you approve or reject with one click."
6. (If there is a pending signup, demonstrate the approve flow.)

### Step 3: Client Detail

1. Navigate to **Clients**.
2. Click on a client to open their detail page.
3. **Show**:
   - Profile card (status, plan tier, phone, language)
   - Plan period card (start/end dates, days remaining)
   - Assessment summary (weight, height, level, goals)
   - Payment history (all past signup records with screenshots)
   - Activation/deactivation controls
4. **Say**: "You have full visibility into each client's profile, subscription, and payment history."

### Step 4: Tickets

1. Navigate to **Tickets**.
2. **Show**: The ticket list with status indicators.
3. Open a ticket and show the conversation thread.
4. **Demonstrate**: Type a reply (or show the reply interface).
5. **Say**: "You respond to client questions right here. They get notified via push notification and email."

### Step 5: FAQ Management

1. Navigate to **FAQs**.
2. **Show**: The FAQ manager with add/edit/delete capabilities.
3. **Say**: "Add frequently asked questions so clients can self-serve before opening tickets. Supports both English and Arabic."

### Step 6: Knowledge Base

1. Navigate to **Knowledge**.
2. **Show**: Both tabs -- Knowledge and Food & Recipes.
3. **Point out**:
   - Text entries with tags (nutrition, workout, recovery, general)
   - PDF upload capability
   - Food database with macro data per 100g
   - Recipe entries with ingredients and instructions
   - Search and filter for the food database
4. **Say**: "This is the secret sauce. The more coaching knowledge you add here, the better the AI-generated plans become. Add your preferred Egyptian foods, local recipes, and training methodologies."

### Step 7: Settings

1. Navigate to **Settings**.
2. **Show**: All configuration sections.
3. **Point out**:
   - Check-in frequency (7-30 days, default 14)
   - Pricing plans (fully customizable -- name, price, duration, features, in both languages)
   - Payment methods (InstaPay, Vodafone Cash, bank transfer -- whatever you use)
   - Social links (Instagram, TikTok, YouTube, etc.)
4. **Say**: "Everything is configurable. Set your own prices, payment methods, and check-in schedule."

---

## Key Talking Points

Use these throughout the demo:

### AI-Powered Plans

"Every meal and workout plan is uniquely generated for each client based on their assessment, check-in data, and your coaching knowledge. No two clients get the same plan."

### Cost Efficiency

"AI plan generation costs approximately $0.20 per client per month. For 500 clients, that's about $100/month in AI costs."

### Bilingual Support

"Full English and Arabic support with proper right-to-left layout. AI generates plans in the client's chosen language."

### PWA Features

"Clients install it like a native app on their phone. Push notifications for check-in reminders, coach responses, and plan updates. Works offline for basic functionality."

### Single-Coach Handoff

"You get the entire platform. Your branding, your domain, your data. No monthly SaaS fees -- it's a one-time setup."

### Scalable

"Handles 500-1000 clients out of the box. The serverless architecture means you only pay for what you use."

---

## Handling Questions

### "How much does it cost to run?"

| Service         | Free Tier            | Typical Monthly Cost (500 clients) |
| --------------- | -------------------- | ---------------------------------- |
| Vercel          | Hobby free           | $0 - $20/month                     |
| Convex          | Free tier generous   | $0 - $25/month                     |
| OpenRouter (AI) | Pay per use          | ~$100/month                        |
| Convex Auth     | Included with Convex | $0                                 |
| Resend          | 3000 emails/day free | $0                                 |
| OneSignal       | Free tier            | $0                                 |
| Sentry          | Free tier            | $0                                 |
| **Total**       |                      | **~$100-145/month**                |

### "Can I customize the branding?"

Yes. The color scheme, fonts, logo, and all UI text are configurable. The app name, social links, and plan details are all managed through the admin settings.

### "What happens if the AI fails?"

The system retries AI generation up to 3 times. If it still fails, the error is logged to Sentry with full context, and the client's previous plan remains active. The coach is not disrupted -- only the new plan generation is delayed.

### "How do clients pay?"

Clients pay through your preferred payment methods (InstaPay, Vodafone Cash, bank transfer). They upload a screenshot of the payment, which is OCR-processed to extract key details. You verify and approve manually in the admin panel.
