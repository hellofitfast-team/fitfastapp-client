# FitFast Authentication Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

Ensure the following environment variables are set in production:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Site URL (for magic link redirects)
NEXT_PUBLIC_SITE_URL=https://fitfast.app
```

### 2. Supabase Email Configuration

#### Configure Email Templates

Navigate to Supabase Dashboard → Authentication → Email Templates

**Magic Link Template:**
```html
<h2>Sign in to FitFast</h2>
<p>Click the link below to sign in to your account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this email, you can safely ignore it.</p>
```

**Password Reset Template:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
```

#### Email Settings
- **Site URL**: `https://fitfast.app`
- **Redirect URLs**:
  - `https://fitfast.app/api/auth/callback`
  - `https://fitfast.app/en/set-password`
  - `https://fitfast.app/ar/set-password`

### 3. Supabase Auth Configuration

Navigate to Supabase Dashboard → Authentication → Settings

**Enable Auth Methods:**
- ✅ Email (for magic links)
- ✅ Password (for password-based login)

**Disable (if not needed):**
- ❌ Email Confirmations (users confirm via magic link)
- ❌ Secure email change (optional)

**Security Settings:**
- **JWT Expiry**: 3600 seconds (1 hour)
- **Refresh Token Rotation**: Enabled
- **Session Timeout**: 604800 seconds (7 days)
- **Password Requirements**: Minimum 8 characters

### 4. Database Schema

Ensure these tables exist with proper RLS policies:

```sql
-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

### 5. Next.js Configuration

Verify `next.config.js` includes:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // For Supabase redirects
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/api/auth/callback',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## Deployment Steps

### Option 1: Vercel Deployment

#### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select "Next.js" as the framework

#### Step 2: Configure Environment Variables
In Vercel Project Settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

#### Step 3: Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Verify deployment at your Vercel URL

#### Step 5: Custom Domain (Optional)
1. Go to Settings → Domains
2. Add custom domain: `fitfast.app`
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

---

### Option 2: Manual Deployment (VPS/Server)

#### Prerequisites
- Node.js 18+ installed
- PM2 or similar process manager
- Nginx or Apache for reverse proxy
- SSL certificate (Let's Encrypt)

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/fitfast.git
cd fitfast
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Set Environment Variables
Create `.env.production.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://fitfast.app
```

#### Step 4: Build Application
```bash
npm run build
```

#### Step 5: Start Production Server
```bash
# Using PM2
pm2 start npm --name "fitfast" -- start
pm2 save
pm2 startup
```

#### Step 6: Configure Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name fitfast.app www.fitfast.app;

    ssl_certificate /etc/letsencrypt/live/fitfast.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fitfast.app/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name fitfast.app www.fitfast.app;
    return 301 https://$server_name$request_uri;
}
```

#### Step 7: Restart Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Post-Deployment Verification

### 1. Test Magic Link Flow
1. Navigate to `https://fitfast.app/en/magic-link`
2. Enter test email
3. Check email inbox
4. Click magic link
5. Verify redirect to set-password page
6. Set password
7. Verify redirect to dashboard

**Expected**: All steps complete without errors

### 2. Test Language Switching
1. Navigate to any auth page
2. Click language switcher
3. Select Arabic
4. Verify URL changes to `/ar/*`
5. Verify all text is in Arabic
6. Switch back to English

**Expected**: Language persists and UI updates correctly

### 3. Test Error Handling
1. Try accessing `/en/set-password` without session
2. Verify error message appears
3. Verify "Request New Magic Link" button works

**Expected**: Graceful error handling

### 4. Test Mobile Responsiveness
1. Open on mobile device or browser dev tools
2. Test all auth pages
3. Verify touch targets are adequate
4. Verify no horizontal scrolling

**Expected**: Fully responsive on all devices

### 5. Test Accessibility
1. Navigate using only keyboard
2. Test with screen reader (if available)
3. Verify color contrast

**Expected**: Fully accessible

### 6. Check Performance
1. Run Lighthouse audit in Chrome DevTools
2. Check Core Web Vitals
3. Verify no console errors

**Expected**:
- Performance: 90+
- Accessibility: 100
- Best Practices: 90+
- SEO: 90+

---

## Monitoring and Logging

### 1. Supabase Dashboard
Monitor authentication metrics:
- Go to Supabase Dashboard → Authentication → Users
- Check daily active users
- Monitor failed authentication attempts
- Review error logs

### 2. Application Logs
Check application logs for errors:
```bash
# If using PM2
pm2 logs fitfast

# Check for auth errors
pm2 logs fitfast --err
```

### 3. Error Tracking (Optional)
Consider integrating error tracking:
- **Sentry**: For frontend/backend error tracking
- **LogRocket**: For session replay and debugging
- **DataDog**: For comprehensive monitoring

**Sentry Integration:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 4. Analytics (Optional)
Track authentication events:
- Magic link requests
- Successful password sets
- Failed login attempts
- Language preferences

**Suggested Tools:**
- Google Analytics 4
- Mixpanel
- Amplitude

---

## Troubleshooting

### Issue 1: Magic Link Not Received
**Possible Causes:**
- Email in spam folder
- Supabase email service not configured
- Invalid email address

**Solution:**
1. Check Supabase Dashboard → Authentication → Email Templates
2. Verify email service is enabled
3. Check spam/junk folder
4. Test with different email provider

---

### Issue 2: Magic Link Expired
**Possible Causes:**
- Link clicked after 1 hour
- Token already used

**Solution:**
1. Request new magic link
2. Check token expiry settings in Supabase
3. Consider increasing JWT expiry time

---

### Issue 3: Redirect Loop After Auth
**Possible Causes:**
- Incorrect redirect URLs in Supabase
- Middleware not handling auth correctly

**Solution:**
1. Verify redirect URLs in Supabase settings
2. Check `/api/auth/callback/route.ts` logic
3. Review middleware configuration

---

### Issue 4: Language Not Persisting
**Possible Causes:**
- Router not properly configured
- Locale not in URL

**Solution:**
1. Verify `next-intl` configuration
2. Check routing.ts file
3. Ensure locale prefix is "always"

---

### Issue 5: Password Validation Not Working
**Possible Causes:**
- JavaScript disabled
- zod schema mismatch

**Solution:**
1. Verify form validation logic
2. Check browser console for errors
3. Test in different browsers

---

## Rollback Plan

If issues arise after deployment:

### Option 1: Revert to Previous Version
```bash
# On Vercel
# Go to Deployments → Select previous deployment → "Promote to Production"

# On VPS
git revert HEAD
npm run build
pm2 restart fitfast
```

### Option 2: Disable Auth Features
Temporarily redirect auth pages:
```typescript
// In middleware.ts or layout
if (pathname.includes('/auth')) {
  return redirect('/maintenance');
}
```

---

## Security Considerations

### 1. HTTPS Only
Ensure all traffic uses HTTPS:
- SSL certificate installed
- HTTP redirects to HTTPS
- HSTS header enabled

### 2. Rate Limiting
Implement rate limiting for auth endpoints:
```typescript
// Example with Upstash Redis
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
});
```

### 3. CORS Configuration
Verify CORS settings in Supabase:
- Allowed origins: `https://fitfast.app`
- Allowed methods: `GET, POST, PUT, DELETE`
- Credentials: `true`

### 4. Content Security Policy
Add CSP headers in `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        },
      ],
    },
  ];
}
```

---

## Maintenance Mode

To enable maintenance mode during updates:

### 1. Create Maintenance Page
```typescript
// app/maintenance/page.tsx
export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1>Under Maintenance</h1>
        <p>We'll be back soon!</p>
      </div>
    </div>
  );
}
```

### 2. Redirect All Traffic
```typescript
// middleware.ts
if (process.env.MAINTENANCE_MODE === 'true') {
  if (!pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
}
```

---

## Support and Documentation

### Internal Documentation
- **Architecture Docs**: `/docs/architecture.md`
- **API Docs**: `/docs/api.md`
- **Component Docs**: Storybook (if implemented)

### External Resources
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **next-intl Docs**: https://next-intl-docs.vercel.app

### Team Contacts
- **Lead Developer**: dev@fitfast.com
- **DevOps**: devops@fitfast.com
- **Support**: support@fitfast.com

---

## Success Criteria

Deployment is considered successful when:

- ✅ All authentication flows work end-to-end
- ✅ No console errors in production
- ✅ Performance metrics meet targets (Lighthouse 90+)
- ✅ Accessibility audit passes (WCAG AA)
- ✅ Both languages work correctly
- ✅ Mobile responsiveness verified
- ✅ Error handling is robust
- ✅ Monitoring and logging active
- ✅ SSL certificate valid
- ✅ No security vulnerabilities
- ✅ Load testing completed (if applicable)
- ✅ Backup and rollback plan tested

---

## Next Steps After Deployment

1. **Monitor Performance**: Watch for any issues in first 24-48 hours
2. **Gather Feedback**: Collect user feedback on auth experience
3. **Optimize**: Based on real-world usage data
4. **Iterate**: Implement enhancements based on feedback
5. **Document**: Keep documentation up to date
6. **Scale**: Plan for increased traffic and users

---

## Changelog

### Version 1.0.0 (2026-02-05)
- Initial authentication implementation
- Magic link authentication
- Password setup flow
- Language switching (English/Arabic)
- Responsive design
- Accessibility compliance

---

## License

Copyright © 2026 FitFast. All rights reserved.

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Version**: 1.0.0

**Sign-Off**:
- [ ] Development Lead
- [ ] QA Lead
- [ ] DevOps Lead
- [ ] Product Manager
