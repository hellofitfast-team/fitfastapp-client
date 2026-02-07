# Authentication Backend - Deployment Checklist

## Pre-Deployment Checklist

### Environment Configuration

- [ ] **Environment Variables Set**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (server-only)
  - [ ] `NEXT_PUBLIC_APP_URL` set to production URL
  - [ ] All variables added to deployment platform (Vercel/Netlify)

- [ ] **Supabase Project Setup**
  - [ ] Production Supabase project created
  - [ ] Database tables created (profiles, initial_assessments)
  - [ ] RLS policies enabled on all tables
  - [ ] Auth email templates configured
  - [ ] Email provider configured (SMTP/SendGrid)
  - [ ] Magic link redirect URLs whitelisted

### Database Setup

- [ ] **Profiles Table**
  - [ ] Table created with correct schema
  - [ ] Trigger for automatic profile creation on signup
  - [ ] RLS policy: Users can read own profile
  - [ ] RLS policy: Only service role can update status
  - [ ] Index on `id` column
  - [ ] Default values set correctly

- [ ] **Initial Assessments Table**
  - [ ] Table created with correct schema
  - [ ] Foreign key constraint on `user_id`
  - [ ] RLS policy: Users can read own assessment
  - [ ] RLS policy: Users can insert own assessment
  - [ ] RLS policy: Users can update own assessment
  - [ ] Index on `user_id` column

- [ ] **Database Migrations**
  - [ ] All migrations run successfully
  - [ ] Migration files committed to repo
  - [ ] Rollback strategy documented

### Supabase Auth Configuration

- [ ] **Email Authentication**
  - [ ] Email authentication enabled
  - [ ] Magic link email template customized
  - [ ] Email rate limiting configured
  - [ ] Sender email verified
  - [ ] Email deliverability tested

- [ ] **Auth Settings**
  - [ ] JWT expiry time configured (recommended: 1 hour)
  - [ ] Refresh token rotation enabled
  - [ ] Session timeout configured
  - [ ] Redirect URLs configured:
    - [ ] `${PRODUCTION_URL}/api/auth/callback`
    - [ ] `${PRODUCTION_URL}/en/auth/callback`
    - [ ] `${PRODUCTION_URL}/ar/auth/callback`

- [ ] **Security Settings**
  - [ ] PKCE flow enabled
  - [ ] Email confirmations enabled (if required)
  - [ ] Auto-confirm disabled (unless testing)
  - [ ] Rate limiting enabled

### Code Quality

- [ ] **TypeScript**
  - [ ] No TypeScript errors (`npm run type-check`)
  - [ ] All types properly defined
  - [ ] No `any` types used
  - [ ] Database types up to date

- [ ] **Linting**
  - [ ] ESLint passes (`npm run lint`)
  - [ ] No console.logs in production code
  - [ ] Error handling implemented everywhere
  - [ ] Comments added where needed

- [ ] **Testing**
  - [ ] Manual testing completed
  - [ ] All user flows tested
  - [ ] Edge cases handled
  - [ ] Error states tested

### Security Review

- [ ] **Authentication**
  - [ ] Session cookies are httpOnly
  - [ ] Session cookies are secure (HTTPS only)
  - [ ] Session cookies have sameSite=lax
  - [ ] No sensitive data in localStorage
  - [ ] No sensitive data in query parameters

- [ ] **API Routes**
  - [ ] All protected routes check authentication
  - [ ] Proper error messages (no info leakage)
  - [ ] Rate limiting implemented (Supabase level)
  - [ ] Input validation implemented
  - [ ] SQL injection prevention (parameterized queries)

- [ ] **Client-Side**
  - [ ] No service role key exposed
  - [ ] No sensitive data in client bundle
  - [ ] XSS prevention measures in place
  - [ ] CSRF protection via Supabase

- [ ] **RLS Policies**
  - [ ] All tables have RLS enabled
  - [ ] Policies tested with real users
  - [ ] Admin operations use service role
  - [ ] No policy bypass vulnerabilities

### Performance

- [ ] **Middleware**
  - [ ] Minimal database queries
  - [ ] Edge runtime compatible
  - [ ] Fast redirect responses
  - [ ] No unnecessary await calls

- [ ] **API Routes**
  - [ ] Efficient database queries
  - [ ] Proper indexes in place
  - [ ] Response times acceptable
  - [ ] No N+1 query problems

- [ ] **Client-Side**
  - [ ] SWR caching configured
  - [ ] Revalidation strategy set
  - [ ] Loading states implemented
  - [ ] Error boundaries in place

### Monitoring & Logging

- [ ] **Error Tracking**
  - [ ] Sentry configured (if using)
  - [ ] Error boundaries in React components
  - [ ] API errors logged properly
  - [ ] Middleware errors logged

- [ ] **Analytics**
  - [ ] Auth events tracked (if using analytics)
  - [ ] Failed login attempts logged
  - [ ] Session metrics tracked
  - [ ] User flow analytics set up

### Documentation

- [ ] **Code Documentation**
  - [ ] All public functions documented
  - [ ] Complex logic explained
  - [ ] Type definitions clear
  - [ ] README updated

- [ ] **User Documentation**
  - [ ] Authentication guide written
  - [ ] Quick reference available
  - [ ] Troubleshooting guide complete
  - [ ] API documentation up to date

### Testing Scenarios

- [ ] **Happy Path**
  - [ ] User signs in with magic link
  - [ ] User receives email
  - [ ] User clicks link and authenticates
  - [ ] User redirected based on status
  - [ ] User can access dashboard
  - [ ] User can log out

- [ ] **Pending Approval**
  - [ ] New user status is pending_approval
  - [ ] User redirected to /pending
  - [ ] User cannot access dashboard
  - [ ] User sees pending message

- [ ] **Active Without Assessment**
  - [ ] Active user without assessment
  - [ ] User redirected to /initial-assessment
  - [ ] User cannot skip assessment
  - [ ] User completes assessment
  - [ ] User can access dashboard

- [ ] **Active With Assessment**
  - [ ] Active user with assessment
  - [ ] User can access dashboard
  - [ ] User can access all features
  - [ ] User profile loads correctly

- [ ] **Inactive Account**
  - [ ] Inactive user redirected to login
  - [ ] Appropriate error message shown
  - [ ] User cannot access any routes
  - [ ] Clear instructions provided

- [ ] **Expired Subscription**
  - [ ] Expired user redirected to login
  - [ ] Subscription expired message shown
  - [ ] User cannot access dashboard
  - [ ] Contact information provided

- [ ] **Edge Cases**
  - [ ] Invalid magic link handled
  - [ ] Expired magic link handled
  - [ ] User without profile handled
  - [ ] Network errors handled gracefully
  - [ ] Concurrent sessions handled

### Internationalization

- [ ] **Locale Support**
  - [ ] English (en) working
  - [ ] Arabic (ar) working
  - [ ] Locale preserved in redirects
  - [ ] Email links include locale
  - [ ] RTL support for Arabic

- [ ] **Email Templates**
  - [ ] English email template configured
  - [ ] Arabic email template configured
  - [ ] Correct locale sent to user
  - [ ] Links include locale parameter

### Deployment Platform

- [ ] **Vercel/Netlify Configuration**
  - [ ] Environment variables added
  - [ ] Build command configured
  - [ ] Output directory set
  - [ ] Node version specified
  - [ ] Edge functions enabled (if Vercel)

- [ ] **Domain & SSL**
  - [ ] Custom domain configured
  - [ ] SSL certificate active
  - [ ] HTTPS enforced
  - [ ] Redirects configured (www → non-www)

- [ ] **Build & Deploy**
  - [ ] Production build successful
  - [ ] No build warnings
  - [ ] Bundle size acceptable
  - [ ] Deploy preview tested
  - [ ] Main branch deployment tested

### Post-Deployment Verification

- [ ] **Smoke Tests**
  - [ ] Home page loads
  - [ ] Login page loads
  - [ ] Magic link sent successfully
  - [ ] Callback route works
  - [ ] Profile API returns data
  - [ ] Logout works

- [ ] **Integration Tests**
  - [ ] Complete sign-in flow works
  - [ ] Dashboard access controlled
  - [ ] Middleware redirects correct
  - [ ] API routes authenticated
  - [ ] Session persists correctly

- [ ] **Performance Tests**
  - [ ] Page load times acceptable
  - [ ] API response times good
  - [ ] Middleware latency low
  - [ ] No memory leaks
  - [ ] No console errors

### Monitoring Setup

- [ ] **Health Checks**
  - [ ] API health endpoint (if needed)
  - [ ] Database connection monitored
  - [ ] Supabase status monitored
  - [ ] Uptime monitoring configured

- [ ] **Alerts**
  - [ ] Failed authentication alerts
  - [ ] High error rate alerts
  - [ ] Performance degradation alerts
  - [ ] Database issue alerts

### Rollback Plan

- [ ] **Backup Strategy**
  - [ ] Database backup taken
  - [ ] Previous deployment tagged
  - [ ] Rollback procedure documented
  - [ ] Recovery time objective defined

- [ ] **Rollback Triggers**
  - [ ] Critical bug discovered
  - [ ] Performance degradation
  - [ ] Security vulnerability
  - [ ] Data integrity issues

## Production Launch

### Pre-Launch

- [ ] All checklist items completed
- [ ] Team notified of deployment
- [ ] Support team briefed
- [ ] Monitoring dashboard ready
- [ ] Rollback plan confirmed

### Launch

- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Check performance metrics

### Post-Launch (First 24 Hours)

- [ ] Monitor authentication metrics
- [ ] Check error logs
- [ ] Verify user flows
- [ ] Monitor database performance
- [ ] Check email delivery rates
- [ ] Gather user feedback

### Post-Launch (First Week)

- [ ] Review all metrics
- [ ] Address any issues found
- [ ] Optimize performance
- [ ] Update documentation
- [ ] Plan next iteration

## Common Issues & Solutions

### Issue: Magic Links Not Sending

**Check:**
- Email provider configured in Supabase
- Email templates saved
- Sender email verified
- Rate limits not exceeded
- Spam folder

### Issue: Authentication Fails

**Check:**
- Environment variables correct
- Supabase project active
- Redirect URLs whitelisted
- Browser cookies enabled
- CORS settings

### Issue: Profile Not Found

**Check:**
- Profile created in database
- RLS policies correct
- User ID matches
- Database connection working

### Issue: Redirect Loop

**Check:**
- Middleware logic correct
- Public routes excluded
- Profile status valid
- Assessment status accurate

## Rollback Procedure

If critical issues occur:

1. **Immediate Actions**
   ```bash
   # Rollback to previous deployment
   vercel rollback

   # Or revert git commit
   git revert HEAD
   git push origin main
   ```

2. **Verify Rollback**
   - Test authentication flow
   - Check error logs cleared
   - Verify metrics normalized

3. **Post-Mortem**
   - Document what went wrong
   - Identify root cause
   - Update checklist
   - Plan fix

## Sign-Off

- [ ] Tech Lead Approval: _______________
- [ ] Security Review: _______________
- [ ] QA Sign-off: _______________
- [ ] Product Owner Approval: _______________

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________

---

**Note**: This checklist should be reviewed and updated after each deployment to reflect lessons learned and process improvements.
