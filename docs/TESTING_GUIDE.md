# FitFast Authentication Testing Guide

## Manual Testing Checklist

### 1. Magic Link Flow

#### Test Case 1.1: Valid Email Submission
**Steps:**
1. Navigate to `/en/magic-link`
2. Enter a valid email address
3. Click "Send Magic Link" button

**Expected Result:**
- Button shows loading spinner and "Sending..." text
- After success, success screen appears with green checkmark
- Email address is displayed on success screen
- "Email sent to: [email]" message is shown

**Pass Criteria:**
- ✅ Loading state appears immediately
- ✅ Success screen appears after API call
- ✅ Email address is correctly displayed
- ✅ No error messages appear

---

#### Test Case 1.2: Invalid Email Format
**Steps:**
1. Navigate to `/en/magic-link`
2. Enter invalid email (e.g., "notanemail")
3. Click "Send Magic Link" button

**Expected Result:**
- Red error message appears below email input
- Message reads: "Please enter a valid email"
- Button remains enabled
- No API call is made

**Pass Criteria:**
- ✅ Validation happens client-side
- ✅ Error message is visible and clear
- ✅ Input border turns red
- ✅ Form does not submit

---

#### Test Case 1.3: Empty Email Submission
**Steps:**
1. Navigate to `/en/magic-link`
2. Leave email field empty
3. Click "Send Magic Link" button

**Expected Result:**
- Browser validation or custom error appears
- Form does not submit

**Pass Criteria:**
- ✅ Validation prevents submission
- ✅ User is informed of required field

---

#### Test Case 1.4: Network Error Handling
**Steps:**
1. Disconnect from internet
2. Navigate to `/en/magic-link`
3. Enter valid email
4. Click "Send Magic Link" button

**Expected Result:**
- Loading state appears
- After timeout, error banner appears at top of form
- Error message describes the issue
- User can retry by submitting again

**Pass Criteria:**
- ✅ Error is caught and displayed
- ✅ Error message is user-friendly
- ✅ Form remains functional for retry

---

#### Test Case 1.5: Back Navigation
**Steps:**
1. Navigate to `/en/magic-link`
2. Click "Back to Login" link

**Expected Result:**
- User is redirected to `/en/login`
- Navigation is smooth without page reload (client-side routing)

**Pass Criteria:**
- ✅ Link is visible and clickable
- ✅ Redirects to correct page
- ✅ No errors in console

---

### 2. Set Password Flow

#### Test Case 2.1: Valid Password Setup
**Steps:**
1. Click magic link from email (or navigate to `/en/set-password` with valid session)
2. Enter password: "Test1234"
3. Enter confirm password: "Test1234"
4. Click "Set Password" button

**Expected Result:**
- Loading spinner appears on button
- Button text changes to "Updating..."
- Success screen appears with green checkmark
- "Password set successfully!" message shown
- After 2 seconds, auto-redirect to dashboard

**Pass Criteria:**
- ✅ Loading state is immediate
- ✅ Success screen appears
- ✅ Auto-redirect works after 2 seconds
- ✅ No console errors

---

#### Test Case 2.2: Password Strength Indicator
**Steps:**
1. Navigate to `/en/set-password` (with valid session)
2. Type password: "abc" (weak)
3. Type password: "abcdefgh" (medium)
4. Type password: "Abcd1234" (strong)

**Expected Result:**
- Strength bars update in real-time
- Weak: 1/3 bars filled, "Weak" label
- Medium: 2/3 bars filled, "Medium" label
- Strong: 3/3 bars filled, "Strong" label

**Pass Criteria:**
- ✅ Strength indicator updates on each keystroke
- ✅ Visual feedback is clear
- ✅ Labels are accurate

---

#### Test Case 2.3: Password Mismatch
**Steps:**
1. Navigate to `/en/set-password`
2. Enter password: "Test1234"
3. Enter confirm password: "Different1234"
4. Try to submit

**Expected Result:**
- Red error message appears below confirm password field
- Message reads: "Passwords don't match"
- Form does not submit
- User can correct and resubmit

**Pass Criteria:**
- ✅ Validation catches mismatch
- ✅ Error is clear and actionable
- ✅ Form prevents submission

---

#### Test Case 2.4: Weak Password Validation
**Steps:**
1. Navigate to `/en/set-password`
2. Enter password: "abc123" (too short)
3. Enter confirm password: "abc123"
4. Try to submit

**Expected Result:**
- Red error message appears below password field
- Message describes requirements (8+ chars, uppercase, lowercase, number)
- Form does not submit

**Pass Criteria:**
- ✅ Client-side validation catches weak password
- ✅ Error message explains requirements
- ✅ User can correct and retry

---

#### Test Case 2.5: Expired Session Handling
**Steps:**
1. Navigate to `/en/set-password` WITHOUT a valid session (e.g., direct URL access)
2. Wait for page load

**Expected Result:**
- Page shows error icon (red alert circle)
- Message: "Session Expired"
- Description: "Invalid or expired session. Please request a new magic link."
- Button: "Request New Magic Link"
- Clicking button redirects to `/en/magic-link`

**Pass Criteria:**
- ✅ Session validation happens on page load
- ✅ Error state is clear and informative
- ✅ User can easily request new link
- ✅ No form is displayed

---

### 3. Language Switching

#### Test Case 3.1: Switch to Arabic
**Steps:**
1. Navigate to `/en/magic-link`
2. Click language switcher (globe icon) in header
3. Select "العربية" (Arabic)

**Expected Result:**
- Page URL changes to `/ar/magic-link`
- All text changes to Arabic
- Layout switches to RTL (right-to-left)
- Form labels, buttons, and messages are in Arabic
- Language switcher shows current selection

**Pass Criteria:**
- ✅ Language switches without page reload
- ✅ URL updates with locale
- ✅ All UI text is translated
- ✅ RTL layout is correct

---

#### Test Case 3.2: Switch Back to English
**Steps:**
1. While on Arabic page (`/ar/*`)
2. Click language switcher
3. Select "English"

**Expected Result:**
- Page URL changes to `/en/*`
- All text changes to English
- Layout switches to LTR (left-to-right)
- Language switcher shows current selection

**Pass Criteria:**
- ✅ Language switches smoothly
- ✅ URL updates correctly
- ✅ LTR layout is restored

---

#### Test Case 3.3: Language Persistence
**Steps:**
1. Switch to Arabic
2. Navigate to different auth page
3. Check language

**Expected Result:**
- Language remains Arabic across navigation
- URL always includes `/ar/` prefix
- Language persists across page refreshes

**Pass Criteria:**
- ✅ Language selection persists
- ✅ No unexpected language resets

---

### 4. Layout and UI

#### Test Case 4.1: Header Branding
**Steps:**
1. Navigate to any auth page
2. Observe header

**Expected Result:**
- Fixed header at top of page
- FitFast logo (FF) on left side (or right for RTL)
- "FitFast" brand name next to logo
- Language switcher on opposite side
- Header has subtle backdrop blur effect

**Pass Criteria:**
- ✅ Header is visible and fixed
- ✅ Branding is clear and professional
- ✅ Layout is balanced

---

#### Test Case 4.2: Responsive Design - Mobile
**Steps:**
1. Open browser dev tools
2. Switch to mobile view (iPhone 12 Pro, 390x844)
3. Navigate to `/en/magic-link`

**Expected Result:**
- Form is centered and full-width with padding
- All text is readable
- Buttons are large enough to tap (min 44px)
- No horizontal scrolling
- Header adjusts to mobile size

**Pass Criteria:**
- ✅ Layout is mobile-optimized
- ✅ All interactive elements are touch-friendly
- ✅ Content fits screen without overflow

---

#### Test Case 4.3: Footer
**Steps:**
1. Navigate to any auth page
2. Scroll to bottom

**Expected Result:**
- Footer displays: "© 2026 FitFast. All rights reserved."
- Footer is at bottom of viewport
- Footer has subtle border at top

**Pass Criteria:**
- ✅ Footer is visible
- ✅ Copyright text is current year
- ✅ Footer styling matches design

---

### 5. Accessibility Testing

#### Test Case 5.1: Keyboard Navigation
**Steps:**
1. Navigate to `/en/magic-link`
2. Use Tab key to navigate through elements
3. Use Enter to submit form

**Expected Result:**
- Tab moves focus to: email input → submit button → back link → language switcher
- Focus outline is visible on all elements
- Enter key submits form when on button
- Shift+Tab moves focus backward

**Pass Criteria:**
- ✅ All interactive elements are keyboard-accessible
- ✅ Tab order is logical
- ✅ Focus indicators are visible

---

#### Test Case 5.2: Screen Reader (VoiceOver/NVDA)
**Steps:**
1. Enable screen reader
2. Navigate to `/en/magic-link`
3. Tab through form elements

**Expected Result:**
- Screen reader announces: "Email" label
- Screen reader announces: "Email input field"
- Screen reader announces: "Send Magic Link button"
- Error messages are announced when they appear
- Loading states are announced

**Pass Criteria:**
- ✅ All elements have proper labels
- ✅ Announcements are clear and helpful
- ✅ Form structure is understandable

---

#### Test Case 5.3: Color Contrast
**Steps:**
1. Use browser dev tools or contrast checker
2. Check contrast ratios of:
   - Body text on background
   - Error text on background
   - Button text on button background

**Expected Result:**
- All text meets WCAG AA standards (4.5:1 for normal text)
- Error text is easily readable
- Button text is clearly visible

**Pass Criteria:**
- ✅ Contrast ratios pass WCAG AA
- ✅ Text is readable in all states

---

### 6. Integration Testing

#### Test Case 6.1: Complete Magic Link Flow
**Steps:**
1. Navigate to `/en/magic-link`
2. Enter email: "test@example.com"
3. Submit form
4. Open email client (or check Supabase logs)
5. Click magic link in email
6. Should redirect to `/en/set-password`
7. Enter password: "Test1234"
8. Confirm password: "Test1234"
9. Submit form
10. Should redirect to dashboard

**Expected Result:**
- Each step completes successfully
- No errors in console
- User ends up authenticated on dashboard

**Pass Criteria:**
- ✅ Email is received
- ✅ Magic link works
- ✅ Password is set
- ✅ User is authenticated
- ✅ Redirect to dashboard works

---

#### Test Case 6.2: Auth Callback Handling
**Steps:**
1. Manually construct callback URL: `/api/auth/callback?code=test_code&type=magiclink`
2. Navigate to URL

**Expected Result:**
- Callback route processes the code
- User is redirected to `/en/set-password` or appropriate page
- Session is established

**Pass Criteria:**
- ✅ Callback handles different URL parameters
- ✅ Redirects are correct
- ✅ Errors are handled gracefully

---

### 7. Error Scenarios

#### Test Case 7.1: Invalid Magic Link
**Steps:**
1. Navigate to `/api/auth/callback?code=invalid_code`

**Expected Result:**
- User is redirected to error page
- Error message explains the issue
- User can request new magic link

**Pass Criteria:**
- ✅ Invalid codes are detected
- ✅ User is informed clearly
- ✅ Recovery path is provided

---

#### Test Case 7.2: Expired Magic Link
**Steps:**
1. Wait for magic link to expire (typically 1 hour)
2. Click expired magic link

**Expected Result:**
- User is redirected to error page
- Error message: "Link expired"
- User can request new magic link

**Pass Criteria:**
- ✅ Expiration is detected
- ✅ Clear error message
- ✅ Easy recovery

---

### 8. Performance Testing

#### Test Case 8.1: Page Load Time
**Steps:**
1. Open browser dev tools (Network tab)
2. Clear cache
3. Navigate to `/en/magic-link`
4. Measure time to interactive

**Expected Result:**
- Page loads in < 2 seconds on 3G
- First contentful paint < 1 second
- No layout shifts (CLS < 0.1)

**Pass Criteria:**
- ✅ Fast page loads
- ✅ Good Core Web Vitals
- ✅ Smooth user experience

---

#### Test Case 8.2: Form Submission Speed
**Steps:**
1. Navigate to `/en/magic-link`
2. Enter email
3. Click submit
4. Measure time to success screen

**Expected Result:**
- API call completes in < 3 seconds
- Loading state is immediate
- Success screen appears promptly

**Pass Criteria:**
- ✅ API calls are fast
- ✅ No unnecessary delays
- ✅ Good perceived performance

---

## Automated Testing (Future)

### Unit Tests (Jest + React Testing Library)

```typescript
// Example test for LanguageSwitcher
describe('LanguageSwitcher', () => {
  it('switches language when option is selected', () => {
    render(<LanguageSwitcher />);
    // Test implementation
  });
});

// Example test for form validation
describe('magicLinkSchema', () => {
  it('validates email format', () => {
    // Test implementation
  });
});
```

### E2E Tests (Playwright/Cypress)

```typescript
// Example E2E test
test('magic link flow', async ({ page }) => {
  await page.goto('/en/magic-link');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Email sent!')).toBeVisible();
});
```

---

## Bug Report Template

When reporting bugs, please include:

1. **Title**: Short description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots**: Visual proof of the issue
6. **Environment**:
   - Browser: Chrome 120
   - OS: macOS 14.2
   - Device: MacBook Pro
   - Language: en/ar
7. **Console Errors**: Any errors in browser console
8. **Severity**: Critical / High / Medium / Low

---

## Test Environment Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Valid Supabase credentials
- Email account for testing

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_supabase_key
```

### Running Development Server
```bash
npm run dev
# or
yarn dev
```

### Access Pages
- Magic Link: http://localhost:3000/en/magic-link
- Set Password: http://localhost:3000/en/set-password (requires session)
- Login: http://localhost:3000/en/login

---

## Sign-Off Checklist

Before marking authentication as complete, ensure:

- ✅ All test cases pass
- ✅ No console errors
- ✅ Accessibility audit passes
- ✅ Mobile responsiveness verified
- ✅ Both languages tested (English & Arabic)
- ✅ Error handling is robust
- ✅ Loading states work correctly
- ✅ Success states appear as expected
- ✅ Integration with Supabase works
- ✅ Code is documented
- ✅ README is up to date

---

## Contact

For testing support or questions:
- Development Team: dev@fitfast.com
- QA Team: qa@fitfast.com
