# FitFast - Developer Guide

## Quick Start

This guide helps you understand the project structure and continue development.

---

## Project Architecture

### Authentication Flow

```
1. User visits app
   ↓
2. Middleware checks auth
   ↓
3. Not authenticated? → /login
   ↓
4. Login options:
   - Email/Password (immediate)
   - Magic Link (email → callback → set-password)
   ↓
5. Check profile status:
   - No profile? → /welcome
   - pending_approval? → /pending
   - No assessment? → /initial-assessment
   - active? → /dashboard
```

### Data Flow

```
Client Component
   ↓
useAuth / useMealPlans / useWorkoutPlans (SWR hooks)
   ↓
Supabase Client (browser)
   ↓
Supabase Database (with RLS)
```

### AI Plan Generation Flow

```
User submits check-in
   ↓
POST /api/plans/meal or /api/plans/workout
   ↓
Fetch user profile + assessment + check-in
   ↓
Call AI generator (OpenRouter + DeepSeek V3)
   ↓
Parse JSON response
   ↓
Save to database
   ↓
Return to client
```

---

## Key Files Explained

### Authentication

**`src/middleware.ts`**
- Runs on EVERY request
- Checks authentication status
- Routes users based on profile status
- VERY IMPORTANT for security

**`src/lib/auth/utils.ts`**
- Server-side auth helpers
- Use in Server Components and API routes

**`src/hooks/use-auth.ts`**
- Client-side auth hook
- Use in Client Components
- Returns: `{ user, profile, loading, signOut, refetch }`

### Data Fetching

**Pattern:** All data fetching uses SWR for:
- Automatic caching
- Revalidation on focus
- Optimistic updates
- Error handling

**Example:**
```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;

  return <div>Hello {profile.full_name}</div>;
}
```

### AI Integration

**`src/lib/ai/openrouter.ts`**
- Generic OpenRouter client
- Use `.complete()` for simple prompts
- Use `.chat()` for conversation

**`src/lib/ai/meal-plan-generator.ts`**
- Generates structured meal plans
- Returns JSON with meals, macros, instructions

**`src/lib/ai/workout-plan-generator.ts`**
- Generates structured workout plans
- Returns JSON with exercises, sets, reps

**Important Notes:**
- AI responses are JSON strings that need parsing
- Always clean markdown formatting (```json```)
- Add error handling for parsing failures
- Consider caching generated plans

---

## How to Add a New Page

### Example: Implementing Meal Plan Page

1. **Create the page component**
```typescript
// src/app/[locale]/(dashboard)/meal-plan/page.tsx
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";

export default function MealPlanPage() {
  const { user } = useAuth();
  const { mealPlan, isLoading, error } = useCurrentMealPlan(user?.id);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading plan</div>;
  if (!mealPlan) return <div>No active plan</div>;

  return (
    <div>
      {/* Display meal plan data */}
      <h1>Meal Plan</h1>
      <pre>{JSON.stringify(mealPlan.plan_data, null, 2)}</pre>
    </div>
  );
}
```

2. **Add translations**
```json
// src/messages/en.json
{
  "meals": {
    "title": "Meal Plan",
    "todaysMeals": "Today's Meals",
    // ... more keys
  }
}
```

3. **Use the translations**
```typescript
import { useTranslations } from "next-intl";

export default function MealPlanPage() {
  const t = useTranslations("meals");

  return <h1>{t("title")}</h1>;
}
```

---

## Common Patterns

### Server Component (Default)
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function ServerPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .single();

  return <div>{data.full_name}</div>;
}
```

### Client Component (with hooks)
```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";

export default function ClientPage() {
  const { user, profile } = useAuth();

  return <div>{profile?.full_name}</div>;
}
```

### API Route
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here

  return NextResponse.json({ success: true });
}
```

### Form with react-hook-form + zod
```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}

      <input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Database Queries

### Fetch User's Data
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

### Fetch with Relations
```typescript
const { data: mealPlan } = await supabase
  .from("meal_plans")
  .select(`
    *,
    user:profiles(full_name)
  `)
  .eq("user_id", userId)
  .single();
```

### Insert Data
```typescript
const { data, error } = await supabase
  .from("check_ins")
  .insert({
    user_id: userId,
    weight: 75.5,
    notes: "Feeling great!",
  })
  .select()
  .single();
```

### Update Data
```typescript
const { error } = await supabase
  .from("profiles")
  .update({ status: "active" })
  .eq("id", userId);
```

---

## Styling Guide

### Use Tailwind Classes
```typescript
<div className="flex items-center gap-4 p-6 rounded-lg bg-white shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

### Use shadcn/ui Components
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

### RTL Support (Arabic)
Tailwind automatically handles RTL when the `dir="rtl"` is set on the HTML element (handled by next-intl).

---

## Testing Your Changes

### 1. Type Check
```bash
npm run type-check
```

### 2. Run Dev Server
```bash
npm run dev
```

### 3. Test in Browser
- Open http://localhost:3000
- Test both languages: /en and /ar
- Test different user states (logged out, pending, active)

### 4. Check Console
- No TypeScript errors
- No runtime errors
- No Supabase errors

---

## Common Issues & Solutions

### Issue: "Unauthorized" in API routes
**Solution:** Make sure you're using `createClient()` from `@/lib/supabase/server` in API routes, not the client version.

### Issue: Page redirects in a loop
**Solution:** Check your middleware logic. Make sure profile status matches the expected route.

### Issue: SWR hook not updating
**Solution:** Call `refetch()` or `mutate()` after data changes.

### Issue: Translation key not found
**Solution:** Add the key to both `en.json` and `ar.json`.

### Issue: Types not matching database
**Solution:** Regenerate types from Supabase dashboard or update `src/types/database.ts`.

---

## Next Features to Implement

### 1. Dashboard with Real Data

**File:** `src/app/[locale]/(dashboard)/page.tsx`

**What to do:**
- Use `useCurrentMealPlan()` and `useCurrentWorkoutPlan()`
- Display today's meals and workout
- Show completion status
- Add quick action buttons

**Example:**
```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentMealPlan } from "@/hooks/use-meal-plans";
import { useCurrentWorkoutPlan } from "@/hooks/use-workout-plans";

export default function DashboardPage() {
  const { user } = useAuth();
  const { mealPlan } = useCurrentMealPlan(user?.id);
  const { workoutPlan } = useCurrentWorkoutPlan(user?.id);

  // Display data...
}
```

### 2. Meal Plan Viewer

**File:** `src/app/[locale]/(dashboard)/meal-plan/page.tsx`

**What to do:**
- Day selector (tabs or buttons)
- Display meals for selected day
- Show macros and totals
- Add completion checkboxes
- Meal detail modal

### 3. Workout Plan Viewer

**File:** `src/app/[locale]/(dashboard)/workout-plan/page.tsx`

**What to do:**
- Day selector
- Exercise list with details
- Timer for rest periods
- Completion checkboxes
- Exercise demo GIFs/videos

### 4. Check-in Form

**File:** `src/app/[locale]/(dashboard)/check-in/page.tsx`

**What to do:**
- Multi-step form (weight, measurements, photos, feedback)
- Photo upload to Supabase Storage
- Submit to database
- Trigger plan regeneration API call

---

## Deployment

### Environment Variables
Make sure ALL environment variables are set in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- Railway: Project → Variables

### Build Command
```bash
npm run build
```

### Database Migrations
Supabase handles migrations automatically. Just apply changes in the Supabase dashboard.

---

## Support

If you get stuck:
1. Check the Supabase logs in the dashboard
2. Check browser console for errors
3. Review the IMPLEMENTATION_STATUS.md file
4. Check Next.js and Supabase documentation

---

## Code Quality Checklist

Before committing:
- [ ] No TypeScript errors
- [ ] No console.log() statements (use console.error for errors)
- [ ] Forms have validation
- [ ] Loading states are handled
- [ ] Error states are handled
- [ ] Translations are added for new text
- [ ] Works in both English and Arabic
- [ ] Mobile responsive

---

**Happy coding!** 🚀
