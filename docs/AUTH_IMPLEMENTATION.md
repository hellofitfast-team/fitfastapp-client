# FitFast Authentication Implementation

## Overview

This document describes the complete authentication frontend implementation for the FitFast PWA, including magic link authentication and password setup flows.

## Architecture

### Authentication Flow

```
User Request Magic Link
    ↓
Email Sent (Supabase OTP)
    ↓
User Clicks Magic Link
    ↓
Auth Callback (/api/auth/callback)
    ↓
Set Password Page
    ↓
Dashboard (Authenticated)
```

## Implemented Pages

### 1. Magic Link Page (`/[locale]/magic-link`)

**Location:** `/src/app/[locale]/(auth)/magic-link/page.tsx`

**Features:**
- Email input with validation
- Sends magic link via Supabase `signInWithOtp()`
- Success confirmation screen
- Error handling with user-friendly messages
- Loading states during API calls
- Back navigation to login

**Usage:**
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: data.email,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
});
```

**User Experience:**
1. User enters email address
2. Form validates email format
3. Loading spinner shows during submission
4. Success screen displays with email confirmation
5. User checks email for magic link

**Validation:**
- Email format validation using zod
- Real-time error display
- Disabled submit button during loading

---

### 2. Set Password Page (`/[locale]/set-password`)

**Location:** `/src/app/[locale]/(auth)/set-password/page.tsx`

**Features:**
- Password and confirm password fields
- Real-time password strength indicator
- Session validation before allowing access
- Strong password requirements (min 8 chars, uppercase, lowercase, number)
- Visual strength meter (weak/medium/strong)
- Success screen with auto-redirect
- Expired session handling

**Usage:**
```typescript
const { error } = await supabase.auth.updateUser({
  password: data.password,
});
```

**Password Validation:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Password confirmation must match

**User Experience:**
1. Page loads and validates user session
2. If session invalid, shows error with link to request new magic link
3. User enters password with real-time strength feedback
4. User confirms password
5. Success screen shows for 2 seconds
6. Auto-redirects to dashboard

**Session Validation:**
- Checks for valid Supabase session on page load
- Prevents unauthorized password updates
- Provides clear error messaging for expired sessions

---

### 3. Auth Layout (`/[locale]/(auth)/layout`)

**Location:** `/src/app/[locale]/(auth)/layout.tsx`

**Features:**
- Fixed header with FitFast branding
- Language switcher (English/Arabic)
- Centered content layout
- Gradient background
- Footer with copyright
- Responsive design for all screen sizes

**Components:**
- FitFast logo and brand name
- Language switcher dropdown
- Centered card layout for auth forms

---

## Components

### LanguageSwitcher

**Location:** `/src/components/auth/LanguageSwitcher.tsx`

**Features:**
- Dropdown menu using Radix UI
- Switches between English (en) and Arabic (ar)
- Persists language selection via next-intl router
- Visual indicator for current language
- Accessible with keyboard navigation

**Usage:**
```tsx
<LanguageSwitcher />
```

---

## Internationalization (i18n)

### Translation Keys Added

**English (`/src/messages/en.json`):**
```json
{
  "auth": {
    "signingIn": "Signing in...",
    "magicLinkDescription": "We'll send you a link to sign in without a password",
    "sendMagicLink": "Send Magic Link",
    "sendingMagicLink": "Sending...",
    "emailSent": "Email sent!",
    "emailSentDescription": "Check your email for a magic link...",
    "createPasswordDescription": "Create a secure password for your account",
    "passwordRequirements": "Must be at least 8 characters",
    "updatingPassword": "Updating...",
    "passwordSet": "Password set successfully!",
    "redirectingToDashboard": "Redirecting to dashboard...",
    "selectLanguage": "Select Language",
    "english": "English",
    "arabic": "العربية"
  }
}
```

**Arabic translations** are provided in `/src/messages/ar.json`

### RTL Support

- Automatic RTL layout for Arabic via `tailwindcss-rtl`
- All components support both LTR and RTL
- Text alignment adjusts automatically
- Icons and spacing mirror correctly

---

## Form Validation

### Libraries Used
- **react-hook-form**: Efficient form state management
- **zod**: Type-safe schema validation
- **@hookform/resolvers/zod**: Integration between react-hook-form and zod

### Validation Schemas

**Magic Link Schema:**
```typescript
const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});
```

**Set Password Schema:**
```typescript
const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

---

## Supabase Integration

### Auth Methods Used

1. **Sign In with OTP (Magic Link):**
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: string,
  options: {
    emailRedirectTo: string,
  },
});
```

2. **Update User Password:**
```typescript
const { error } = await supabase.auth.updateUser({
  password: string,
});
```

3. **Get Session:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

4. **Get User:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Auth Callback Route

**Location:** `/src/app/api/auth/callback/route.ts`

**Updated to:**
- Detect magic link authentication
- Redirect to set-password page after magic link
- Handle profile status (pending, active, inactive, expired)
- Redirect to appropriate page based on user state

---

## UI Components Used

### From `/src/components/ui/`:
- **Card**: Container for auth forms
- **Button**: Submit buttons with loading states
- **Input**: Text and password inputs with error styling
- **Label**: Accessible form labels
- **DropdownMenu**: Language switcher dropdown

### Design Tokens
- **Primary Color**: `primary-600` to `primary-700`
- **Error Color**: `error-50` to `error-600`
- **Neutral Colors**: `neutral-50` to `neutral-900`
- **Border Radius**: `rounded-lg`, `rounded-xl`, `rounded-full`
- **Shadows**: `shadow-sm`, `shadow-md`

---

## Accessibility (a11y)

### WCAG AA Compliance

**Implemented Features:**
- Semantic HTML elements (`<label>`, `<button>`, `<form>`)
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus states on all interactive elements
- Error messages associated with form fields
- Loading states communicated to screen readers
- Sufficient color contrast ratios

**Screen Reader Support:**
- Form errors announced on change
- Loading states announced
- Success/error messages announced
- Language switcher properly labeled

**Keyboard Navigation:**
- Tab through all form fields
- Enter to submit forms
- Escape to close dropdowns
- Arrow keys for dropdown navigation

---

## Performance Optimizations

### Code Splitting
- Route-based splitting via Next.js App Router
- Only interactive components use `"use client"`
- Server components for static content

### Form Performance
- react-hook-form reduces re-renders
- Controlled inputs only re-render on change
- Validation runs on blur, not on every keystroke

### Loading States
- Visual feedback during API calls
- Disabled buttons prevent duplicate submissions
- Spinner animations for better UX

---

## Security Considerations

### Password Security
- Strong password requirements enforced
- Password strength indicator guides users
- Passwords never logged or exposed
- Secure transmission via HTTPS (Supabase)

### Session Security
- Session validation before password updates
- Expired session detection and handling
- CSRF protection via Supabase client
- XSS protection via React auto-escaping

### Input Validation
- Client-side validation with zod
- Server-side validation by Supabase
- SQL injection prevention (Supabase handles)
- Email format validation

---

## Error Handling

### User-Facing Errors
- Network errors: "Network error. Please check your connection."
- Invalid email: "Please enter a valid email"
- Weak password: "Password must be at least 8 characters..."
- Password mismatch: "Passwords don't match"
- Expired session: "Invalid or expired session. Please request a new magic link."

### Error Display
- Inline errors below form fields
- Banner errors at top of form
- Error styling with red background and border
- Clear, actionable error messages

---

## Testing Recommendations

### Unit Tests
- LanguageSwitcher component
- Form validation schemas
- Password strength indicator logic
- Error state handling

### Integration Tests
- Magic link submission flow
- Set password submission flow
- Session validation logic
- Language switching

### E2E Tests
- Complete magic link flow (email → link → password → dashboard)
- Language persistence across pages
- Error handling for various scenarios
- Mobile responsiveness

### Accessibility Tests
- Keyboard navigation through forms
- Screen reader announcements
- Color contrast validation
- Focus management

---

## File Structure

```
/src
├── app
│   └── [locale]
│       └── (auth)
│           ├── layout.tsx          # Auth layout with header/footer
│           ├── magic-link
│           │   └── page.tsx        # Magic link request page
│           └── set-password
│               └── page.tsx        # Password setup page
├── components
│   ├── auth
│   │   └── LanguageSwitcher.tsx   # Language dropdown
│   └── ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       └── label.tsx
├── i18n
│   ├── navigation.ts
│   └── routing.ts
├── lib
│   └── supabase
│       └── client.ts               # Supabase client setup
└── messages
    ├── en.json                     # English translations
    └── ar.json                     # Arabic translations
```

---

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Browser Support

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced UX with JavaScript enabled
- Fallback styling for older browsers

---

## Mobile Responsiveness

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile Features
- Touch-friendly input sizes (min 44px)
- Optimized keyboard handling
- Full-screen layout on mobile
- Native mobile scrolling

---

## Future Enhancements

### Potential Improvements
1. **Biometric Authentication**: Face ID / Touch ID support
2. **Social Auth**: Google, Apple, Facebook login
3. **Two-Factor Authentication**: SMS or authenticator app
4. **Password Recovery**: Forgot password flow
5. **Remember Device**: Persistent sessions
6. **Login History**: Show recent login locations
7. **Email Verification**: Verify email before full access

### Performance Improvements
1. **Prefetch Dashboard**: Load dashboard data after auth
2. **Service Worker**: Offline support
3. **Image Optimization**: Lazy load images
4. **Bundle Optimization**: Further code splitting

---

## Support

For issues or questions, contact the development team or create a support ticket.

## License

Copyright © 2026 FitFast. All rights reserved.
