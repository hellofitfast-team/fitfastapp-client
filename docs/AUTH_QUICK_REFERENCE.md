# Authentication Quick Reference Guide

## Quick Start

### Check if user is authenticated (Server Component)

```typescript
import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    redirect("/en/login");
  }

  // User is authenticated
  return <div>Welcome {userProfile.profile?.full_name}</div>;
}
```

### Check if user is authenticated (Client Component)

```typescript
"use client";

import { useProfile } from "@/hooks/use-profile";

export function MyComponent() {
  const { profile, isLoading } = useProfile();

  if (isLoading) return <div>Loading...</div>;
  if (!profile?.authenticated) return <div>Please log in</div>;

  return <div>Welcome {profile.profile?.full_name}</div>;
}
```

## Common Use Cases

### 1. Protect a Server Component

```typescript
import { canAccessDashboard } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const hasAccess = await canAccessDashboard();

  if (!hasAccess) {
    redirect("/en/initial-assessment");
  }

  return <div>Dashboard Content</div>;
}
```

### 2. Get User Profile Data

```typescript
import { getCurrentUserProfile } from "@/lib/auth/helpers";

export default async function ProfilePage() {
  const userProfile = await getCurrentUserProfile();

  return (
    <div>
      <h1>{userProfile?.profile?.full_name}</h1>
      <p>Status: {userProfile?.profile?.status}</p>
      <p>Plan: {userProfile?.profile?.plan_tier}</p>
    </div>
  );
}
```

### 3. Check Subscription Expiry

```typescript
import { getDaysRemaining, isSubscriptionExpiringSoon } from "@/lib/auth/helpers";

export default async function SubscriptionBanner() {
  const expiringSoon = await isSubscriptionExpiringSoon();
  const daysLeft = await getDaysRemaining();

  if (!expiringSoon || !daysLeft) return null;

  return (
    <div className="alert alert-warning">
      Your subscription expires in {daysLeft} days!
    </div>
  );
}
```

### 4. Client-Side Profile Display

```typescript
"use client";

import { useProfile } from "@/hooks/use-profile";

export function ProfileCard() {
  const { profile, isLoading, mutate } = useProfile();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{profile?.profile?.full_name}</h2>
      <button onClick={() => mutate()}>Refresh Profile</button>
    </div>
  );
}
```

### 5. Logout Button

```typescript
"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });

    if (res.ok) {
      router.push("/en/login");
      router.refresh();
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### 6. Magic Link Login

```typescript
"use client";

import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: "en" }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Check your email for the magic link!");
      } else {
        setMessage(data.error || "Failed to send magic link");
      }
    } catch (error) {
      setMessage("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Magic Link"}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### 7. Conditional Rendering Based on Status

```typescript
"use client";

import { useProfileStatus } from "@/hooks/use-profile";

export function StatusBanner() {
  const { status, isLoading } = useProfileStatus();

  if (isLoading) return null;

  switch (status) {
    case "pending_approval":
      return <div className="banner warning">Awaiting approval...</div>;
    case "inactive":
      return <div className="banner error">Account inactive</div>;
    case "expired":
      return <div className="banner error">Subscription expired</div>;
    default:
      return null;
  }
}
```

### 8. Protected API Route

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // User is authenticated, proceed with logic
  return NextResponse.json({ message: "Success", userId: user.id });
}
```

### 9. Get User Data in API Route

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user's data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile });
}
```

### 10. Admin Operations (Use Carefully!)

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // IMPORTANT: Add your own auth check here!
  // This should only be accessible to admins

  const supabase = createAdminClient();

  // Admin operations that bypass RLS
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", userId);

  return NextResponse.json({ data });
}
```

## Profile Status Flow

```
pending_approval → Can only access /pending
       ↓
    active (no assessment) → Must complete /initial-assessment
       ↓
    active (with assessment) → Full dashboard access
       ↓
    expired/inactive → Redirect to login
```

## Common Patterns

### Server Component + Client Component

```typescript
// app/dashboard/page.tsx (Server Component)
import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const userProfile = await getCurrentUserProfile();

  // Pass initial data to client component
  return <DashboardClient initialProfile={userProfile} />;
}

// dashboard-client.tsx (Client Component)
"use client";

import { useProfile } from "@/hooks/use-profile";

export function DashboardClient({ initialProfile }) {
  // Use SWR with fallback data
  const { profile } = useProfile();
  const currentProfile = profile || initialProfile;

  return <div>Welcome {currentProfile?.profile?.full_name}</div>;
}
```

### Redirect Based on Status

```typescript
import { getRedirectPath } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function SomePage() {
  const path = await getRedirectPath("en");
  redirect(path);
}
```

## Tips and Best Practices

1. **Server Components**: Use auth helpers from `@/lib/auth/helpers`
2. **Client Components**: Use hooks from `@/hooks/use-profile`
3. **API Routes**: Use `createClient()` from `@/lib/supabase/server`
4. **Middleware**: Already handles auth, don't add extra checks
5. **Admin Operations**: Only use `createAdminClient()` in server-side code with proper auth checks
6. **Caching**: SWR automatically caches profile data
7. **Revalidation**: Call `mutate()` to refresh profile data after updates
8. **Error Handling**: Always handle null/undefined cases
9. **Localization**: Pass locale parameter to redirect functions
10. **Security**: Never expose service role key to client

## Debugging

### Check if middleware is running:

```typescript
// Add to middleware.ts temporarily
console.log("Middleware running for:", pathname, "User:", user?.id);
```

### Check profile in server component:

```typescript
const userProfile = await getCurrentUserProfile();
console.log("User Profile:", JSON.stringify(userProfile, null, 2));
```

### Check profile in client component:

```typescript
const { profile } = useProfile();
console.log("Client Profile:", profile);
```

### Test API endpoint:

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

## Common Errors

### "User not authenticated"
- Check if session cookie is present
- Verify Supabase URL and keys in .env
- Check if middleware is running

### "Profile not found"
- Verify profile exists in database
- Check RLS policies allow read access
- Ensure user_id matches auth.users.id

### "Redirect loop"
- Check middleware logic for circular redirects
- Verify public routes are excluded
- Check profile status is valid

### "Assessment not found"
- User may not have completed onboarding
- Check initial_assessments table
- Verify foreign key is correct
