# Authentication System Documentation

## Overview

The FitFast PWA authentication system is built on Supabase Auth with custom middleware to handle profile status-based routing and access control. The system supports magic link authentication and manages user flows based on their profile status and onboarding completion.

## Architecture

### Components

1. **Middleware** (`/src/middleware.ts`)
   - Checks authentication status
   - Validates profile status
   - Enforces routing rules
   - Preserves i18n locale

2. **Auth Callback** (`/src/app/api/auth/callback/route.ts`)
   - Handles magic link callbacks
   - Exchanges code for session
   - Redirects based on profile status

3. **Profile API** (`/src/app/api/auth/profile/route.ts`)
   - Returns current user profile
   - Includes assessment status
   - Provides routing information

4. **Server Helpers** (`/src/lib/auth/helpers.ts`)
   - Server-side auth utilities
   - Profile status checks
   - Subscription management

5. **Client Hooks** (`/src/hooks/use-profile.ts`)
   - React hooks for profile data
   - SWR-based caching
   - Client-side auth state

## User Flow

### Profile Status States

1. **pending_approval**
   - User has signed up but awaiting admin approval
   - Can only access `/pending` page
   - Cannot access dashboard or onboarding

2. **active**
   - User is approved and has active subscription
   - Must complete initial assessment before dashboard access
   - Can access all features once assessment is complete

3. **inactive**
   - User account is temporarily disabled
   - Redirected to login with error message
   - Cannot access any protected routes

4. **expired**
   - User subscription has ended
   - Redirected to login with expiration message
   - Cannot access any protected routes

### Routing Logic

```
┌─────────────────────────────────────────────┐
│          User tries to access route         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Authenticated? │
         └────┬───────┬───┘
              │       │
         NO   │       │   YES
              │       │
              ▼       ▼
        ┌─────────┐  ┌──────────────────┐
        │ /login  │  │ Check Profile    │
        └─────────┘  │ Status           │
                     └────┬───────┬─────┘
                          │       │
              ┌───────────┼───────┼──────────┐
              │           │       │          │
              ▼           ▼       ▼          ▼
       ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐
       │ pending_ │  │ active │  │inactive│  │expired │
       │ approval │  │        │  │        │  │        │
       └─────┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
             │           │           │           │
             ▼           ▼           ▼           ▼
        ┌────────┐  ┌──────────┐  ┌──────────────────┐
        │/pending│  │Assessment│  │ /login?message=  │
        │        │  │Complete? │  │ account_inactive │
        └────────┘  └────┬─────┘  └──────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                   NO        YES
                    │         │
                    ▼         ▼
          ┌────────────────┐  ┌───────────┐
          │ /initial-      │  │ Dashboard │
          │  assessment    │  │  Access   │
          └────────────────┘  └───────────┘
```

## API Routes

### POST /api/auth/sign-in

Send magic link to user's email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "locale": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check your email for the magic link"
}
```

### GET /api/auth/callback

Handles magic link callback and redirects based on profile status.

**Query Parameters:**
- `code` (required): OAuth code from Supabase
- `next` (optional): Redirect path after authentication

### GET /api/auth/profile

Returns current user's profile and status.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "profile": {
    "id": "uuid",
    "full_name": "John Doe",
    "status": "active",
    "plan_tier": "6_months",
    "language": "en"
  },
  "assessment": {
    "completed": true,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "redirectPath": "/",
  "canAccessDashboard": true
}
```

### POST /api/auth/logout

Signs out the current user and clears session.

**Response:**
```json
{
  "success": true
}
```

## Server-Side Usage

### In Server Components

```typescript
import { getCurrentUserProfile } from "@/lib/auth/helpers";

export default async function DashboardPage() {
  const userProfile = await getCurrentUserProfile();

  if (!userProfile) {
    redirect("/login");
  }

  return <div>Welcome {userProfile.profile?.full_name}</div>;
}
```

### Check Access Permission

```typescript
import { canAccessDashboard } from "@/lib/auth/helpers";

export default async function ProtectedPage() {
  const hasAccess = await canAccessDashboard();

  if (!hasAccess) {
    redirect("/initial-assessment");
  }

  // Render protected content
}
```

### Get Redirect Path

```typescript
import { getRedirectPath } from "@/lib/auth/helpers";

export default async function SomePage() {
  const redirectPath = await getRedirectPath("en");
  redirect(redirectPath);
}
```

## Client-Side Usage

### Use Profile Hook

```typescript
"use client";

import { useProfile } from "@/hooks/use-profile";

export function ProfileDisplay() {
  const { profile, isLoading, error } = useProfile();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading profile</div>;

  return <div>Hello {profile?.profile?.full_name}</div>;
}
```

### Check Authentication

```typescript
"use client";

import { useIsAuthenticated } from "@/hooks/use-profile";

export function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useIsAuthenticated();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return children;
}
```

### Check Dashboard Access

```typescript
"use client";

import { useCanAccessDashboard } from "@/hooks/use-profile";

export function DashboardGuard({ children }) {
  const { canAccess, isLoading } = useCanAccessDashboard();

  if (isLoading) return <div>Loading...</div>;
  if (!canAccess) return <div>Complete onboarding first</div>;

  return children;
}
```

## Middleware Configuration

The middleware runs on all routes except:
- `/api/*` - API routes
- `/_next/*` - Next.js internals
- `/favicon.*` - Favicon files
- Static files (containing `.`)

### Public Routes (no auth required):
- `/login`
- `/magic-link`
- `/set-password`
- `/auth/callback`
- `/auth/auth-code-error`

### Protected Routes:
All other routes require authentication and are subject to profile status checks.

## Database Requirements

### profiles table

Required columns:
- `id` (uuid, references auth.users)
- `status` (enum: pending_approval, active, inactive, expired)
- `plan_tier` (enum: 3_months, 6_months, 12_months)
- `plan_start_date` (date)
- `plan_end_date` (date)
- `language` (enum: en, ar)
- `full_name` (text)

### initial_assessments table

Required columns:
- `id` (uuid)
- `user_id` (uuid, references profiles.id)
- `created_at` (timestamp)

## Security Considerations

1. **Row Level Security (RLS)**
   - Enable RLS on all tables
   - Users can only read/write their own data
   - Admin operations use service role key

2. **Session Management**
   - Sessions handled by Supabase Auth
   - Cookies are httpOnly and secure
   - Middleware refreshes sessions automatically

3. **API Routes**
   - All protected routes check authentication
   - Profile checks validate user status
   - Error messages don't expose sensitive info

4. **Client-Side**
   - Never expose service role key
   - Use SWR for caching with revalidation
   - Handle errors gracefully

## Environment Variables

Required variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

### Test Authentication Flow

1. **Magic Link Sign-In**
   ```bash
   curl -X POST http://localhost:3000/api/auth/sign-in \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "locale": "en"}'
   ```

2. **Check Profile**
   ```bash
   curl http://localhost:3000/api/auth/profile \
     -H "Cookie: your-session-cookie"
   ```

3. **Logout**
   ```bash
   curl -X POST http://localhost:3000/api/auth/logout \
     -H "Cookie: your-session-cookie"
   ```

## Troubleshooting

### Common Issues

1. **Redirect Loop**
   - Check that middleware logic doesn't create circular redirects
   - Verify public routes are properly excluded
   - Check profile status is valid

2. **Session Not Persisting**
   - Verify cookies are being set correctly
   - Check NEXT_PUBLIC_APP_URL matches your domain
   - Ensure middleware is updating session

3. **Profile Not Found**
   - Verify profile exists in database
   - Check RLS policies allow read access
   - Ensure user_id matches auth.users.id

4. **Assessment Check Fails**
   - Verify initial_assessments table exists
   - Check user_id foreign key is correct
   - Ensure RLS policies are configured

## Best Practices

1. Always use server-side checks for critical auth decisions
2. Client-side hooks are for UI state only
3. Never trust client-side auth state for security
4. Use middleware for route protection
5. Cache profile data with SWR for better UX
6. Handle all error states gracefully
7. Provide clear feedback to users
8. Log auth errors for debugging

## Future Enhancements

- [ ] Add password authentication option
- [ ] Implement OAuth providers (Google, Apple)
- [ ] Add session timeout warnings
- [ ] Implement remember me functionality
- [ ] Add two-factor authentication
- [ ] Add activity logs
- [ ] Implement device management
