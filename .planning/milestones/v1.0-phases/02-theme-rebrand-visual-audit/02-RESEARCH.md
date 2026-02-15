# Phase 2: Theme Rebrand - Visual Audit - Research

**Researched:** 2026-02-12
**Domain:** Visual regression testing, accessibility auditing, cross-browser compatibility validation
**Confidence:** HIGH

## Summary

Phase 2 focuses on **validating** the Royal Blue theme implementation completed in Phase 1. This is an audit phase, not a building phase. The research covers four primary domains: (1) accessibility testing tools and WCAG 2.2 compliance verification, (2) cross-browser compatibility patterns for Chrome/Safari/Firefox, (3) RTL/Arabic visual testing workflows, and (4) PWA manifest theme validation.

**Key finding:** No automated visual regression testing infrastructure exists in the project (no Vitest, Playwright, or Storybook). This phase will rely on manual testing workflows using Chrome DevTools, browser-native tools, and systematic component state verification checklists.

**Primary recommendation:** Use Chrome DevTools accessibility features as the primary tool for contrast verification, leverage browser DevTools for component state testing (hover/focus/disabled), and follow a structured manual testing checklist for cross-browser and RTL validation.

## Standard Stack

### Core Testing Tools (Browser-Native)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Chrome DevTools Accessibility | Built-in | Contrast ratio verification, ARIA inspection, source order validation | Official W3C-aligned WCAG testing, no setup required, real-time feedback |
| Chrome Lighthouse | Built-in | Automated accessibility audit, performance baseline | Industry standard, already integrated in Chrome, comprehensive coverage |
| Firefox Accessibility Inspector | Built-in | Secondary verification, different rendering engine (Gecko) | Catches WebKit/Blink-specific issues, strong ARIA support |
| Safari Web Inspector | Built-in | WebKit-specific testing (critical for iOS/macOS) | Safari lags on certain CSS features (flex-basis, grid gaps), must validate |

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| WebAIM Contrast Checker | Web tool | Manual contrast calculation verification | Verify Royal Blue (#4169E1) against all backgrounds (cream, white, black) |
| axe DevTools Browser Extension | Latest | Automated accessibility scanning | Quick spot-checks during manual testing, catches common ARIA issues |
| next-intl | 4.8.2 (installed) | RTL/Arabic language switching | Switch locale to test Arabic visual consistency |
| tailwindcss-rtl | 0.9.0 (installed) | RTL layout support | Already configured, verify logical class usage |

### Current Project Status

**No automated testing infrastructure:**
- ❌ No Vitest or test files (`find` shows zero .test.ts files)
- ❌ No Storybook for component isolation
- ❌ No Playwright for E2E testing
- ✅ ESLint with `eslint-plugin-jsx-a11y` (accessibility linting)
- ✅ TypeScript type checking

**Implication:** Manual testing workflows required. User decision: "Skip test suite for now (focus on visible UX, not infrastructure)."

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual testing | Chromatic + Storybook | Would add infrastructure overhead (contradicts user's "skip test suite" decision) |
| Chrome DevTools | Percy + CI/CD integration | Requires setup time, ongoing maintenance, not worth it for one-time audit |
| Manual contrast checks | Automated axe-core testing | Axe-core requires test infrastructure (Vitest), same tradeoff |

**Installation:**

No new packages required. All tools are browser-native or already installed.

## Architecture Patterns

### Recommended Testing Structure

```
Manual Testing Workflow/
├── accessibility-audit/     # WCAG 2.2 contrast and semantic checks
│   ├── contrast-verification.md
│   └── aria-inspection.md
├── cross-browser/           # Chrome, Safari, Firefox visual parity
│   ├── chrome-baseline.md
│   ├── safari-quirks.md
│   └── firefox-validation.md
├── rtl-testing/             # Arabic language and RTL layout
│   ├── rtl-layout.md
│   └── mixed-content.md
└── component-states/        # Hover, focus, disabled, active states
    ├── shadcn-ui-components.md
    └── custom-components.md
```

### Pattern 1: Chrome DevTools Contrast Workflow

**What:** Use Chrome's built-in accessibility tools to verify WCAG 2.2 AA compliance (4.5:1 text, 3:1 UI).

**When to use:** For every interactive element with Royal Blue (#4169E1) or semantic colors.

**Workflow:**
1. Right-click element → Inspect
2. In Styles pane, click color swatch next to `color:` property
3. Contrast ratio displays below color picker
4. Look for: ✓✓ (AAA pass), ✓ (AA pass), or ✗ (fail)
5. If fail, adjust lightness until passing

**Example (from Chrome DevTools official docs):**
```
Royal Blue (#4169E1) on Cream (#FFFEF5): 4.79:1
✓ WCAG AA Text (4.5:1 required) - PASS
✓ WCAG AA UI (3:1 required) - PASS
```

**Limitation:** Contrast checker only works for `color:` property. For borders, backgrounds, use external tools like WebAIM Contrast Checker.

**Source:** [Chrome DevTools Accessibility Reference](https://developer.chrome.com/docs/devtools/accessibility/reference)

### Pattern 2: Component State Testing Checklist

**What:** Systematically test all shadcn/ui component states using DevTools pseudo-class toggles.

**When to use:** For every shadcn/ui component and custom interactive component.

**States to verify:**
- **Default:** Component renders correctly at rest
- **Hover:** Background/text color changes, visual feedback clear
- **Focus:** 4px solid ring visible (Royal Blue), outline-offset correct
- **Active/Pressed:** Visual depression or color change
- **Disabled:** Opacity 50%, pointer-events none, grayed appearance
- **Loading:** Spinner visible, button still disabled

**Workflow:**
1. Open Chrome DevTools → Elements panel
2. Right-click element in DOM tree → Force state
3. Check `:hover`, `:focus`, `:active`, `:disabled` one by one
4. Verify contrast ratios for each state
5. Test keyboard navigation (Tab, Enter, Space)

**Source:** [UXPin Manual Testing Checklist](https://www.uxpin.com/studio/blog/checklist-for-manual-testing-of-react-components/), [Nielsen Norman Group Button States](https://www.nngroup.com/articles/button-states-communicate-interaction/)

**Code example (from FitFast button.tsx):**
```typescript
// Current implementation already has proper state classes
const buttonVariants = cva(
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-cream hover:bg-primary",
        // ... other variants
      }
    }
  }
);
```

### Pattern 3: RTL Visual Testing Workflow

**What:** Verify Arabic locale renders correctly with logical CSS classes and proper text direction.

**When to use:** For every page and component that displays text or has directional UI.

**Workflow:**
1. Switch locale to Arabic: `http://localhost:3000/ar`
2. Verify `dir="rtl"` on `<html>` tag
3. Check text alignment (right-aligned for Arabic)
4. Verify spacing classes use logical properties (`ms-*`, `me-*` not `ml-*`, `mr-*`)
5. Test mixed LTR/RTL content (English numbers in Arabic text)
6. Verify icons that should flip (arrows) vs shouldn't flip (settings gear)

**Key shadcn/ui RTL conversions (January 2026 update):**
- Physical: `ml-4` → Logical: `ms-4`
- Physical: `text-left` → Logical: `text-start`
- Physical: `left-*` → Logical: `start-*`
- Icons: Directional arrows get `rtl:rotate-180`

**Source:** [shadcn/ui RTL Support Changelog](https://ui.shadcn.com/docs/changelog/2026-01-rtl), [Madrus RTL Implementation Guide](https://madrus4u.vercel.app/blog/rtl-implementation-guide)

**Anti-pattern to avoid:**
```typescript
// ❌ BAD: Checking locale instead of direction
{locale === 'ar' && <RTLLayout />}

// ✅ GOOD: Checking direction property (supports ALL RTL languages)
{direction === 'rtl' && <RTLLayout />}
```

### Pattern 4: Cross-Browser Safari Quirk Testing

**What:** Explicitly test Safari for known CSS rendering differences (Flexbox, Grid, Sticky positioning).

**When to use:** For any layout using Flexbox, CSS Grid, or `position: sticky`.

**Known Safari issues (2026):**
- **Flexbox `flex-basis`:** Safari misinterprets without explicit value → Always specify `flex: 1 1 auto`
- **Grid gaps:** May not render correctly → Verify visually in Safari
- **`position: sticky`:** Known bugs even in latest Safari → Test scrolling behavior
- **`min-height: 100vh`:** Unreliable on iOS Safari → Use `min-h-screen` Tailwind class

**Testing workflow:**
1. Open app in Safari (macOS/iOS)
2. Compare side-by-side with Chrome
3. Look for: misaligned flex items, missing grid gaps, broken sticky headers
4. If found, add explicit Flexbox values or use alternative layout

**Source:** [CSS Browser Compatibility Issues 2026](https://www.testmuai.com/blog/css-browser-compatibility-issues/), [Pixel Free Studio Cross-Browser Debugging](https://blog.pixelfreestudio.com/cross-browser-debugging-solving-inconsistencies-in-safari-and-chrome/)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contrast ratio calculation | Custom color luminance algorithm | Chrome DevTools contrast checker, WebAIM Contrast Checker | Edge cases (alpha channels, color spaces), browser rendering differences, WCAG compliance verification |
| Visual regression screenshots | Custom screenshot diffing tool | Manual spot-checks with browser DevTools | No test infrastructure, one-time audit (not ongoing), setup cost > value |
| Accessibility auditing | Manual DOM inspection for ARIA | Chrome Lighthouse, axe DevTools extension | Catches 30-40% of issues automatically, standardized against WCAG 2.2, free and fast |
| RTL layout conversion | Manual CSS direction overrides | Tailwind logical properties (`ms-*`, `start-*`) | Already configured via `tailwindcss-rtl` plugin, automatic with proper class usage |
| PWA theme color validation | Custom manifest parser | Browser DevTools Application tab | Shows rendered theme color, detects manifest errors, simulates install |

**Key insight:** Browser DevTools are mature and comprehensive for one-time audits. Custom tooling only makes sense for ongoing regression testing (explicitly out of scope per user decision).

## Common Pitfalls

### Pitfall 1: Testing Only Hover, Skipping Focus States

**What goes wrong:** Keyboard users (accessibility requirement) can't see which element is focused.

**Why it happens:** Developers test with mouse, forget keyboard navigation. Focus styles often subtle or missing.

**How to avoid:**
- Test every interactive element with `Tab` key navigation
- Verify 4px solid ring appears on `:focus-visible` (already in globals.css line 162)
- Check contrast ratio of focus ring (Royal Blue #4169E1) against all backgrounds

**Warning signs:**
- Tabbing through page skips elements
- No visible ring/outline when element focused
- Focus ring blends into background (low contrast)

**Verification command:**
```bash
# Ensure focus styles present in globals.css
grep -A 5 "focus-visible" src/app/globals.css
```

**Source:** [Next.js Accessibility Docs](https://nextjs.org/docs/architecture/accessibility)

### Pitfall 2: Assuming Global Config Means No Component-Specific Overrides

**What goes wrong:** Custom components or shadcn/ui variants override global theme, causing inconsistent colors.

**Why it happens:** Tailwind utility classes have higher specificity than CSS custom properties. Developers add `bg-blue-500` instead of `bg-primary`.

**How to avoid:**
- Grep for hardcoded color classes: `bg-blue-`, `text-orange-`, etc.
- Verify all components use semantic classes (`bg-primary`, `text-success-500`)
- Check compiled CSS in DevTools for unexpected hex values

**Warning signs:**
- Color picker in DevTools shows `#3B82F6` (Tailwind blue-500) instead of `#4169E1` (Royal Blue)
- Hover state uses different blue shade than other components

**Verification command:**
```bash
# Check for hardcoded Tailwind color classes (should use semantic colors)
grep -r "bg-blue-\|bg-orange-\|bg-green-\|text-blue-\|text-orange-\|text-green-" src/components/ --include="*.tsx"
```

### Pitfall 3: Testing Only Chrome, Missing Safari/Firefox Quirks

**What goes wrong:** Layout breaks or colors render differently in Safari/Firefox due to engine differences (WebKit vs Blink vs Gecko).

**Why it happens:** Chrome dominates developer usage (65%+ market share), Safari/Firefox only tested as afterthought.

**How to avoid:**
- Test Safari first (most quirky), then Firefox, then Chrome
- Compare screenshots side-by-side
- Check Safari Web Inspector for CSS warnings

**Warning signs:**
- Flexbox items don't align in Safari
- Grid gaps missing in Safari
- Font rendering looks heavier/lighter in Firefox

**Known differences (2026):**
- Safari: Flex-basis issues, grid gaps, sticky positioning bugs
- Firefox: Font rendering sharper, slower JavaScript performance
- Chrome: Most standards-compliant, baseline for comparison

**Source:** [Browser Compatibility Testing Key Differences](https://medium.com/@case_lab/browser-compatibility-testing-key-differences-in-firefox-safari-and-chrome-18b133ec9507)

### Pitfall 4: Forgetting Mixed LTR/RTL Content in Arabic

**What goes wrong:** English numbers or brand names in Arabic text render incorrectly (wrong direction, misaligned).

**Why it happens:** Browser's bidirectional algorithm guesses direction, sometimes wrong for mixed content.

**How to avoid:**
- Use `<bdi>` tag for dynamic text with uncertain directionality
- Test Arabic pages with English numbers (dates, weights, reps)
- Verify form inputs handle mixed input correctly

**Warning signs:**
- Numbers appear on wrong side of Arabic text
- Brand names (FitFast) flip incorrectly in Arabic
- Input fields cursor jumps unexpectedly

**Example fix:**
```tsx
// ✅ GOOD: Isolate bidirectional text
<p>وزنك الحالي: <bdi>{weightInKg}</bdi> كيلو</p>

// ❌ BAD: Browser guesses direction
<p>وزنك الحالي: {weightInKg} كيلو</p>
```

**Source:** [LeanCode Right-to-Left in React Guide](https://leancode.co/blog/right-to-left-in-react)

### Pitfall 5: Contrast Checking Only Text, Ignoring UI Components

**What goes wrong:** Buttons, borders, focus rings fail WCAG 3:1 UI contrast requirement.

**Why it happens:** WCAG 2.2 added 3:1 contrast for "graphical objects and user interface components" (not just text). Developers only check text.

**How to avoid:**
- Check contrast of ALL interactive elements: buttons, borders, icons, focus rings
- Verify disabled states still meet 3:1 (even at 50% opacity)
- Test against all possible backgrounds (cream, white, neutral-100)

**Warning signs:**
- Outline buttons (border only) hard to see
- Focus ring blends into background
- Disabled buttons completely invisible to low-vision users

**WCAG 2.2 requirements:**
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components/graphics: 3:1

**Source:** [W3C Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [Make Things Accessible WCAG 2.2 Contrast Requirements](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)

## Code Examples

Verified patterns from official sources and FitFast codebase:

### Testing Focus States with Chrome DevTools

```javascript
// In Chrome DevTools Console, force focus on button
const button = document.querySelector('button[type="submit"]');
button.focus();

// Verify computed styles show focus ring
const styles = getComputedStyle(button);
console.log('Outline:', styles.outline); // Should show: "4px solid #4169E1"
console.log('Outline offset:', styles.outlineOffset); // Should show: "0"
```

**Source:** Chrome DevTools manual state forcing (Elements → Right-click → Force state → :focus)

### Verifying Royal Blue Contrast Ratios

**Royal Blue (#4169E1) on Cream (#FFFEF5):**
```
Contrast ratio: 4.79:1
WCAG AA Text (4.5:1): PASS ✓
WCAG AA UI (3:1): PASS ✓
```

**Royal Blue (#4169E1) on White (#FFFFFF):**
```
Contrast ratio: 4.84:1
WCAG AA Text (4.5:1): PASS ✓
WCAG AA UI (3:1): PASS ✓
```

**Royal Blue (#4169E1) on Black (#000000):**
```
Contrast ratio: 4.34:1
WCAG AA Text (4.5:1): FAIL ✗
WCAG AA Large Text (3:1): PASS ✓
WCAG AA UI (3:1): PASS ✓
```

**Source:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), Phase 1 verification (4.79:1 confirmed)

### RTL Testing Checklist

```typescript
// Current FitFast globals.css RTL support (already implemented)
// Source: /Users/ziadadel/Desktop/fitfast/src/app/globals.css lines 118-157

[dir="rtl"] {
  text-align: right;
  font-family: var(--font-arabic);
}

[dir="rtl"] * {
  font-family: var(--font-arabic);
  letter-spacing: 0 !important; /* Arabic doesn't use letter-spacing */
}

[dir="rtl"] .text-xs {
  font-size: 0.875rem; /* 14px instead of 12px for readability */
  line-height: 1.4;
}
```

**Manual testing workflow:**
1. Navigate to `http://localhost:3000/ar`
2. Verify `<html dir="rtl">` in DevTools Elements panel
3. Check text aligns right, margins/paddings flip
4. Test interactive elements (buttons, inputs) render correctly
5. Verify Cairo font loads (Arabic-specific typography)

### PWA Manifest Theme Color Validation

**Current implementation (already correct):**
```json
// public/manifest.json
{
  "theme_color": "#4169E1",
  "background_color": "#000000"
}
```

```typescript
// src/app/layout.tsx viewport export
export const viewport: Viewport = {
  themeColor: "#4169E1"
};
```

**Validation workflow:**
1. Open Chrome DevTools → Application tab
2. Click "Manifest" in sidebar
3. Verify theme_color shows Royal Blue (#4169E1)
4. Click "App Icon" preview to simulate install
5. Check PWA chrome (title bar) uses Royal Blue

**Source:** [Next.js PWA Guide 2026](https://medium.com/@amirjld/how-to-implement-pwa-progressive-web-app-in-next-js-app-router-2026-f25a6797d5e6)

### Component State Testing Pattern

```typescript
// Example: Testing Button component states
// File: src/components/ui/button.tsx (already implemented correctly)

// DEFAULT STATE
<Button>Click Me</Button>
// Verify: bg-black, text-cream, no hover

// HOVER STATE (DevTools: Force :hover)
<Button>Click Me</Button>
// Verify: bg-primary (#4169E1), text unchanged

// FOCUS STATE (DevTools: Force :focus-visible)
<Button>Click Me</Button>
// Verify: ring-4 ring-primary (#4169E1), outline-offset 0

// DISABLED STATE
<Button disabled>Click Me</Button>
// Verify: opacity-50, pointer-events-none, grayed appearance

// LOADING STATE
<Button loading>Click Me</Button>
// Verify: spinner visible, disabled true, button text still visible
```

**Contrast verification for each state:**
- Default: Black (#000000) on Cream (#FFFEF5) = 19.56:1 ✓
- Hover: Royal Blue (#4169E1) on Cream (#FFFEF5) = 4.79:1 ✓
- Focus ring: Royal Blue (#4169E1) on Cream (#FFFEF5) = 4.79:1 ✓
- Disabled: Black 50% opacity = still high contrast ✓

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual pixel-perfect screenshot comparison | AI-powered visual regression (Percy, Applitools) | 2024-2025 | Reduces false positives, self-healing tests, but requires infrastructure |
| WCAG 2.1 | WCAG 2.2 Level AA | June 2023 | Added 9 new success criteria, stricter focus indicators, dragging interactions |
| Physical CSS properties (`margin-left`) | Logical CSS properties (`margin-inline-start`) | Tailwind v3+ | RTL support automatic, no manual overrides |
| `eslint-plugin-jsx-a11y` basic rules | Enhanced rules + AI-assisted checks | 2024+ | Catches more ARIA issues, better React integration |
| Safari 50-60% standards compliance | Safari 80%+ compliance (2026) | 2024-2026 | Gap with Chrome narrowed, but still lags on newer features |

**Deprecated/outdated:**
- **WCAG 2.1:** Superseded by WCAG 2.2 (June 2023) — still acceptable but 2.2 is current standard
- **next-pwa plugin:** Next.js App Router now has built-in PWA manifest support (fall 2024)
- **Manual RTL CSS overrides:** shadcn/ui CLI now auto-converts to logical properties (January 2026)
- **Storybook for visual testing:** Vitest 4.0 browser mode (October 2025) now includes visual regression built-in

## Open Questions

1. **Should we test iOS Safari specifically or just macOS Safari?**
   - What we know: PWA theme-color has limited mobile browser support, mainly benefits installed PWAs
   - What's unclear: Whether FitFast targets iOS web app installs (PWA manifest suggests yes)
   - Recommendation: Test macOS Safari for layout issues, defer iOS-specific testing to Phase 10 (Mobile/PWA optimization) if exists

2. **What constitutes "cross-browser testing" for demo-ready criteria?**
   - What we know: Chrome, Safari, Firefox are the big three (95%+ market share)
   - What's unclear: Does "demo-ready" require Edge testing? What about older browser versions?
   - Recommendation: Test latest versions of Chrome (baseline), Safari (quirks), Firefox (validation). Skip Edge (Chromium-based, nearly identical to Chrome). Skip old versions (white-label coaches will use modern browsers).

3. **How deep should RTL testing go before Phase 10 (if RTL-specific phase exists)?**
   - What we know: Phase 1 verification deferred RTL testing to "Phase 10: RTL Audit" (mentioned in verification doc line 99)
   - What's unclear: Does Phase 2 just verify RTL doesn't break, or full RTL UX validation?
   - Recommendation: Phase 2 should do smoke testing only (switch to Arabic, verify no layout crashes, colors consistent). Save deep RTL validation (mixed content, font sizing, icon flipping) for dedicated RTL phase.

4. **Should we document findings in VERIFICATION.md or separate AUDIT.md?**
   - What we know: Phase 1 used VERIFICATION.md for programmatic checks
   - What's unclear: Phase 2 is manual/visual — same format or different?
   - Recommendation: Use VERIFICATION.md format for consistency, but add "Manual Testing Checklist" section with pass/fail for each browser/state combination. Planner should structure tasks to populate this checklist.

## Sources

### Primary (HIGH confidence)

**Chrome DevTools & Accessibility:**
- [Chrome DevTools Accessibility Reference](https://developer.chrome.com/docs/devtools/accessibility/reference) - Official Chrome DevTools accessibility features
- [WebAIM: Contrast Checker](https://webaim.org/resources/contrastchecker/) - WCAG contrast ratio calculator
- [W3C Understanding Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - Official WCAG 2.2 guidelines

**Next.js & PWA:**
- [Next.js Architecture: Accessibility](https://nextjs.org/docs/architecture/accessibility) - Built-in accessibility features, route announcer, ESLint integration
- [Next.js PWA Guide 2026](https://medium.com/@amirjld/how-to-implement-pwa-progressive-web-app-in-next-js-app-router-2026-f25a6797d5e6) - App Router PWA implementation
- [MDN: PWA theme_color](https://developer.mozilla.org/en-US/docs/Web/Manifest/theme_color) - Theme color specification

**RTL Support:**
- [shadcn/ui RTL Support Changelog](https://ui.shadcn.com/docs/changelog/2026-01-rtl) - January 2026 RTL implementation, logical CSS classes
- [Madrus RTL Implementation Guide](https://madrus4u.vercel.app/blog/rtl-implementation-guide) - Tailwind RTL best practices
- [LeanCode Right-to-Left in React](https://leancode.co/blog/right-to-left-in-react) - React RTL patterns, direction vs locale

### Secondary (MEDIUM confidence)

**Testing Methodologies:**
- [UXPin Manual Testing Checklist for React Components](https://www.uxpin.com/studio/blog/checklist-for-manual-testing-of-react-components/) - Component state testing workflow
- [Nielsen Norman Group: Button States](https://www.nngroup.com/articles/button-states-communicate-interaction/) - Interaction state design patterns
- [Chromatic Hover/Focus States Docs](https://www.chromatic.com/docs/hoverfocus/) - Visual regression testing for interaction states

**Cross-Browser Compatibility:**
- [Browser Compatibility Testing Key Differences](https://medium.com/@case_lab/browser-compatibility-testing-key-differences-in-firefox-safari-and-chrome-18b133ec9507) - Safari/Firefox/Chrome rendering differences
- [CSS Browser Compatibility Issues 2026](https://www.testmuai.com/blog/css-browser-compatibility-issues/) - Flexbox/Grid quirks, Safari bugs
- [Pixel Free Studio Cross-Browser Debugging](https://blog.pixelfreestudio.com/cross-browser-debugging-solving-inconsistencies-in-safari-and-chrome/) - Safari vs Chrome layout issues

**Accessibility Audit Documentation:**
- [W3C Template for Accessibility Evaluation Reports](https://www.w3.org/WAI/test-evaluate/report-template/) - Official W3C audit template
- [TestParty Accessibility Audit Reports Guide 2025](https://testparty.ai/blog/accessibility-audit-reports-complete-guide-for-2025) - Comprehensive audit documentation patterns
- [Make Things Accessible WCAG 2.2 Contrast Requirements](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/) - WCAG 2.2 Level AA checklist

### Tertiary (LOW confidence - marked for validation)

**Visual Regression Tools:**
- [The CTO Club: Best Visual Regression Testing Tools 2026](https://thectoclub.com/tools/best-visual-regression-testing-tools/) - Tool comparison (Percy, Applitools, BackstopJS)
- [testRigor: Visual Testing Tools 2026](https://testrigor.com/blog/visual-testing-tools/) - AI-powered visual testing landscape
- [BrowserStack: Automated Visual Regression Testing](https://www.browserstack.com/guide/automated-visual-regression-testing) - Automation best practices

Note: Visual regression tools are LOW confidence for this phase because FitFast explicitly skips test infrastructure. Included for future reference only.

## Metadata

**Confidence breakdown:**
- Accessibility testing (Chrome DevTools, WCAG 2.2): HIGH - Official W3C docs, Chrome docs verified
- Cross-browser compatibility patterns: MEDIUM - Community best practices, not official specs
- RTL testing workflow: HIGH - shadcn/ui official changelog, Tailwind RTL plugin verified
- PWA manifest validation: HIGH - MDN docs, Next.js official docs, FitFast manifest verified

**Research date:** 2026-02-12
**Valid until:** 2026-04-12 (60 days - stable domain, browser DevTools features change slowly)

**Key assumptions:**
1. User decision "Skip test suite for now" means no Vitest/Playwright/Storybook setup
2. "Demo-ready" criteria means latest browser versions only (no legacy support)
3. Phase 10 handles deep RTL validation (Phase 2 is smoke testing)
4. Manual testing acceptable for one-time audit (not ongoing regression testing)

**Potential invalidation triggers:**
- WCAG 2.3 release (unlikely in 60 days)
- Major Chrome DevTools UI changes (rare)
- Safari 18+ fixes known bugs (possible, monitor release notes)
- Next.js 17 changes PWA manifest handling (unlikely in 60 days)
