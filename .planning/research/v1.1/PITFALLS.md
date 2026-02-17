# Domain Pitfalls: FitFast v1.1 Mobile UI Renovation

**Domain:** PWA mobile-first UI renovation (Next.js 16 + React 19 + Tailwind v4)
**Researched:** 2026-02-17
**Overall Confidence:** HIGH (verified against official docs and multiple sources)

---

## Critical Pitfalls

These cause rewrites, broken production apps, or major user-facing regressions.

### 1. Animation Library Bloating the PWA Bundle

**Severity:** CRITICAL

**Problem:** Importing `motion` from `motion` (formerly framer-motion) adds ~34KB gzipped to every page that uses it. In a PWA targeting low-end Android phones in Egypt with spotty 3G/4G, this is the difference between a 1s and 3s first paint. The standard `motion` component cannot be tree-shaken below 34KB because of its declarative, props-driven API.

**Why it happens:** Developers import `motion` directly (the convenient API) instead of using the optimized `m` + `LazyMotion` pattern. Every `"use client"` component that imports `motion` pulls the full animation runtime into that route's bundle.

**Consequences:**
- PWA feels sluggish on budget Android devices (Samsung A series, Xiaomi Redmi -- common in Egypt)
- First Contentful Paint regresses, hurting perceived quality
- Service worker pre-cache size bloats, slowing install

**Prevention:**
1. **Use `m` + `LazyMotion` exclusively.** Never import `motion` directly. The `m` component is identical in API but starts at ~4.6KB, loading features on demand.
2. **Use `domAnimation` (15KB) not `domMax` (25KB).** FitFast does not need drag/pan gestures or layout animations. The `domAnimation` feature set covers: animations, variants, exit animations, tap/hover/focus.
3. **Lazy-load the feature bundle:**
   ```tsx
   // providers/motion-provider.tsx
   "use client";
   import { LazyMotion } from "motion/react";

   const loadFeatures = () =>
     import("motion/react").then((mod) => mod.domAnimation);

   export function MotionProvider({ children }: { children: React.ReactNode }) {
     return <LazyMotion features={loadFeatures} strict>{children}</LazyMotion>;
   }
   ```
4. **Set `strict` on LazyMotion** to get build-time errors if anyone accidentally uses `motion` instead of `m`.
5. **Budget:** Total animation JS should stay under 20KB gzipped. Measure with `next build --analyze` or bundlephobia before/after.

**Detection:** Run `npx @next/bundle-analyzer` after adding animations. If any route chunk exceeds 80KB, investigate.

**Sources:**
- [Motion.dev: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- [Motion.dev: LazyMotion](https://motion.dev/docs/react-lazy-motion)

---

### 2. Fixed Bottom Navigation + Virtual Keyboard = Overlapping UI

**Severity:** CRITICAL

**Problem:** FitFast has input-heavy pages (check-in form, ticket system, onboarding). When the virtual keyboard opens on mobile, `position: fixed` bottom navigation behaves differently on iOS vs Android:
- **Android:** Resizes the viewport, pushing fixed elements up (often overlapping content).
- **iOS Safari:** Keeps the layout viewport the same size, but the visual viewport shrinks. Fixed bottom elements get hidden behind the keyboard.

**Why it happens:** There is no cross-platform standard for how virtual keyboards interact with fixed positioning. The current codebase has fixed elements in `dashboard-shell.tsx`, `sidebar.tsx`, and `check-in/page.tsx`.

**Consequences:**
- Users cannot see or tap the bottom nav while typing
- Submit buttons at the bottom of forms become unreachable
- Clients report "app is broken" to the coach

**Prevention:**
1. **Hide bottom nav when keyboard is open.** Use the `visualViewport` API to detect keyboard:
   ```tsx
   useEffect(() => {
     const vv = window.visualViewport;
     if (!vv) return;
     const handleResize = () => {
       const keyboardOpen = vv.height < window.innerHeight * 0.75;
       setKeyboardVisible(keyboardOpen);
     };
     vv.addEventListener("resize", handleResize);
     return () => vv.removeEventListener("resize", handleResize);
   }, []);
   ```
2. **Move submit buttons inline** (inside the scrollable form content), not fixed to the bottom.
3. **Use `interactive-widget=resizes-content`** in the viewport meta tag for consistent iOS behavior:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
   ```
4. **Test on real devices.** Simulators do not accurately reproduce keyboard behavior.

**Detection:** Test every input-containing page on both iOS Safari and Android Chrome with the virtual keyboard open.

**Sources:**
- [Virtual Keyboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [Ahmad Shadeed: The Virtual Keyboard API](https://ishadeed.com/article/virtual-keyboard-api/)

---

### 3. Breaking RTL During Renovation

**Severity:** CRITICAL

**Problem:** FitFast v1.0 completed a thorough RTL audit (490/490 translation keys). A UI renovation that replaces components risks silently breaking RTL support. This is critical because Arabic is a primary language for the Egyptian user base.

**Why it happens:**
- New animated components use hardcoded `left`/`right` instead of `start`/`end` logical properties
- Slide-in animations use `translateX(100%)` which is wrong direction in RTL
- Swipe gestures assume LTR direction
- Developers test primarily in English, catching RTL bugs late

**Consequences:**
- Arabic-speaking clients see broken layouts
- Coach loses credibility with their audience
- Expensive to fix after the fact (every component must be re-audited)

**Prevention:**
1. **Use Tailwind logical properties exclusively.** `ps-4` not `pl-4`, `ms-auto` not `ml-auto`, `start-0` not `left-0`. Tailwind v4 supports these natively.
2. **Mirror all X-axis animations based on direction:**
   ```tsx
   const dir = document.documentElement.dir;
   const slideIn = dir === "rtl" ? { x: -100 } : { x: 100 };
   ```
   Or better, use a custom hook:
   ```tsx
   function useDirectionalX(ltrValue: number) {
     const dir = useDirection(); // from next-intl or HTML dir
     return dir === "rtl" ? -ltrValue : ltrValue;
   }
   ```
3. **Swipe gestures must invert in RTL.** A "forward" swipe in RTL goes right-to-left (the opposite of LTR). This applies to bottom sheets, carousels, and any horizontal gesture.
4. **Test RTL on every PR.** Add a Playwright test that screenshots each renovated page in both `en` and `ar` locales.
5. **Audit checklist per component:**
   - No `left`/`right` CSS (use `start`/`end`)
   - No hardcoded `translateX` direction
   - No `flex-row` without considering `rtl:flex-row-reverse` (Tailwind handles this with `dir` on parent)
   - Icons that indicate direction (arrows, chevrons) are flipped with `rtl:rotate-180`

**Detection:** Automated Playwright visual regression tests in both locales. Diff any component that changed.

**Sources:**
- [Material Design: Bidirectionality](https://m1.material.io/usability/bidirectionality.html)

---

## High-Severity Pitfalls

### 4. Animation Jank on Low-End Android

**Severity:** HIGH

**Problem:** Budget Android phones (common in Egypt -- devices like Samsung A03, Xiaomi Redmi 10) have weak GPUs and limited RAM. Animations that run smoothly on a developer's iPhone 15 will stutter at 15fps on these devices.

**Why it happens:** Animating layout-triggering CSS properties (width, height, top, left, margin, padding) forces the browser to recalculate layout every frame. Each frame has a 16.7ms budget for 60fps. Layout recalculation on a weak CPU easily exceeds this.

**Prevention:**
1. **Only animate GPU-composited properties:** `transform`, `opacity`, `filter`. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`.
2. **Replace layout animations with transforms:**
   - Expanding card? Use `scale` not `height`
   - Sliding panel? Use `translateX` not `left`
   - Fading content? Use `opacity` not `visibility` transitions
3. **Limit simultaneous animations.** No more than 2-3 elements animating at once on a single screen.
4. **Use `will-change` sparingly and temporarily:**
   ```css
   /* BAD: always-on in stylesheet */
   .card { will-change: transform; }

   /* GOOD: apply via JS before animation, remove after */
   element.style.willChange = "transform";
   // after animation completes:
   element.style.willChange = "auto";
   ```
   Overusing `will-change` creates excess compositor layers that consume GPU memory -- the exact resource that is scarce on budget phones.
5. **Provide reduced-motion alternative:**
   ```tsx
   const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   // Use instant transitions instead of animated ones
   ```
6. **Test on Chrome DevTools with 4x CPU throttling** to simulate budget device performance.

**Detection:** Chrome DevTools Performance tab with CPU throttle. Any frame exceeding 16ms is visible jank.

**Sources:**
- [SitePoint: Achieve 60 FPS Mobile Animations](https://www.sitepoint.com/achieve-60-fps-mobile-animations-with-css3/)
- [Motion.dev: Animation Performance](https://motion.dev/docs/performance)
- [MDN: Animation performance and frame rate](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)

---

### 5. iOS Safari Viewport Height Bugs in PWA Standalone Mode

**Severity:** HIGH

**Problem:** The codebase uses `min-h-screen` extensively (found in: layout.tsx, dashboard-shell.tsx, onboarding layout, auth layout, admin shell, error pages). In iOS Safari, `100vh` (which `min-h-screen` maps to) includes the area behind the browser chrome, causing content to be cut off at the bottom.

**Why it happens:** Mobile Safari sets `100vh` to the height of the viewport with the URL bar collapsed, not the visible area. In PWA standalone mode, this is less of an issue (no URL bar), but safe-area-inset problems persist on devices with the notch/Dynamic Island.

**Prevention:**
1. **Use `100dvh` instead of `100vh`:**
   ```css
   /* In Tailwind v4, use arbitrary values or extend theme */
   min-height: 100dvh; /* dynamic viewport height */
   ```
   `dvh` adjusts dynamically as browser chrome appears/disappears. Supported in all modern browsers since 2023.
2. **Handle safe area insets for notched devices:**
   ```css
   padding-top: env(safe-area-inset-top);
   padding-bottom: env(safe-area-inset-bottom);
   ```
   Already needed for PWA standalone mode where the status bar overlaps content.
3. **In `manifest.json`, verify `display: standalone`** -- this removes the URL bar but the status bar still needs safe-area handling.
4. **Replace `min-h-screen` with a custom utility:**
   ```css
   /* In global CSS or Tailwind config */
   .min-h-app { min-height: 100dvh; }
   ```

**Detection:** Test on iPhone with notch in PWA standalone mode. Content cut off at top/bottom = viewport bug.

**Sources:**
- [Frontend.fyi: Finally a fix for 100vh](https://www.frontend.fyi/tutorials/finally-a-fix-for-100vh-on-mobile)
- [Bram.us: 100vh in Safari on iOS](https://www.bram.us/2020/05/06/100vh-in-safari-on-ios/)

---

### 6. Hydration Mismatch from Animated Components

**Severity:** HIGH

**Problem:** Adding animation components that render differently on server vs client causes React hydration errors. This is especially common with: viewport-dependent animations, `window`/`document` checks in initial render, and components that use `useEffect` to set initial animation state.

**Why it happens:** Next.js App Router server-renders HTML, then React hydrates on the client. If the server renders a component at `opacity: 0` (initial animation state) but the client renders at `opacity: 1` (after animation), React throws a hydration mismatch error.

**Prevention:**
1. **Animation components must be `"use client"` with consistent initial state.** The server-rendered HTML and client first render must match.
2. **Use `initial` prop in motion to set the pre-animation state that matches SSR:**
   ```tsx
   <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
     {/* Server renders with opacity: 0 (matches initial) */}
   </m.div>
   ```
3. **Never conditionally render based on `window` or `document` in the render path.** Use `useEffect` for client-only logic, and render a consistent placeholder during SSR.
4. **Keep animation wrapper components thin.** A `<FadeIn>` wrapper should be a pure client component that wraps server-rendered children -- don't convert entire page sections to client components just for a fade-in.
5. **Minimize the client component boundary surface.** The goal is: server components render content, thin client wrappers add animation.

**Detection:** Check browser console for "Hydration failed because the initial UI does not match" errors. These appear immediately on page load.

**Sources:**
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

### 7. "UI-Only" Changes That Accidentally Break Logic

**Severity:** HIGH

**Problem:** In a renovation, developers assume they are "just changing styles" but accidentally break functionality by:
- Removing a `name` attribute from a form input (breaks React Hook Form)
- Changing component hierarchy (breaks CSS selectors, `querySelector`, or parent-child relationships that logic depends on)
- Replacing a `<button>` with a `<div>` (breaks keyboard accessibility and form submission)
- Moving a component outside a context provider boundary
- Removing a `data-testid` (breaks existing tests)

**Why it happens:** The mental model of "UI-only" creates a false sense of safety. Developers skip functional testing because "I only changed the CSS."

**Prevention:**
1. **Run the full test suite after every component renovation.** Not just visual tests.
2. **Preserve semantic HTML.** If it was a `<button>`, keep it a `<button>`. If it was a `<form>`, keep it a `<form>`.
3. **Keep `data-testid` attributes.** They are part of the contract with tests.
4. **Do not restructure React Hook Form field registration.** The `name` prop and nesting must stay identical.
5. **Renovate in small increments.** One component at a time, tested before moving to the next. Never "redesign 5 pages in one PR."
6. **Zod validation schemas are coupled to form structure.** If you change the form fields displayed, ensure the schema still matches.

**Detection:** Existing Playwright E2E tests and Vitest unit tests should catch most regressions. Run them on every PR.

---

## Medium-Severity Pitfalls

### 8. iOS Safari Body Scroll Lock for Bottom Sheets

**Severity:** MEDIUM

**Problem:** When a bottom sheet or modal overlay is open, scrolling the overlay often "bleeds through" and scrolls the body behind it on iOS Safari. The standard `overflow: hidden` on `<body>` does not reliably prevent this. `overscroll-behavior: none` also does not work on iOS Safari.

**Prevention:**
1. **Use the `position: fixed` body-lock technique:**
   ```tsx
   function lockBody() {
     const scrollY = window.scrollY;
     document.body.style.position = "fixed";
     document.body.style.top = `-${scrollY}px`;
     document.body.style.width = "100%";
   }
   function unlockBody() {
     const scrollY = document.body.style.top;
     document.body.style.position = "";
     document.body.style.top = "";
     document.body.style.width = "";
     window.scrollTo(0, parseInt(scrollY || "0") * -1);
   }
   ```
2. **For bottom sheets with internal scroll,** set `touch-action: none` on the overlay backdrop and `touch-action: pan-y` on the scrollable content area inside the sheet.
3. **Consider using Radix/shadcn Dialog** which already handles scroll lock. If building a custom bottom sheet, port their scroll-lock logic.

**Sources:**
- [Fixing iOS Safari body scroll lock](https://stripearmy.medium.com/i-fixed-a-decade-long-ios-safari-problem-0d85f76caec0)

---

### 9. Client Component Boundary Creep

**Severity:** MEDIUM

**Problem:** Adding animations requires `"use client"` directives. If not carefully bounded, this pushes entire page trees into client-side rendering, losing the benefits of React Server Components (smaller JS bundles, server-side data fetching without waterfalls).

**Why it happens:** A developer adds `"use client"` to a layout or page component to use `motion`. Everything nested under it becomes a client component, even if it doesn't need to be.

**Prevention:**
1. **Create dedicated animation wrapper components:**
   ```tsx
   // components/animations/fade-in.tsx
   "use client";
   import { m } from "motion/react";

   export function FadeIn({ children }: { children: React.ReactNode }) {
     return <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</m.div>;
   }
   ```
   The children (passed as props) can still be server components.
2. **Never add `"use client"` to layout.tsx files** just for animations. Wrap the animated portion in a client component instead.
3. **Audit:** After renovation, check that page components that were server components are still server components. Look for `"use client"` at the page level.

---

### 10. Stale Cached UI After Deployment

**Severity:** MEDIUM

**Problem:** FitFast uses OneSignal's service worker (delegated via `sw.js`). After a major UI renovation deployment, users may see the old UI from the browser's HTTP cache or service worker cache. They report "nothing changed" or worse, see a mix of old and new styles.

**Why it happens:** Next.js uses content-hash-based filenames for JS/CSS chunks, so those update automatically. But:
- The HTML shell may be cached by the browser or CDN
- The service worker may serve stale HTML from its cache
- OneSignal's SW behavior around navigation requests is not fully controllable

**Prevention:**
1. **Verify Next.js cache headers.** Vercel sets appropriate headers for `_next/static/*` (immutable, long-lived) and HTML (short-lived). Confirm this is working.
2. **After deploying the renovation, force a cache-busting navigation request** by updating the OneSignal service worker version or adding a version query param.
3. **Add an app version check.** On app load, fetch a `/api/version` endpoint and compare with the cached version. If mismatched, prompt the user to refresh:
   ```tsx
   // Simple version check
   const res = await fetch("/api/version");
   const { version } = await res.json();
   if (version !== APP_VERSION) {
     // Show "Update available" banner
   }
   ```
4. **Test the upgrade path.** Before deploying, install the current version as a PWA on a test device, then deploy the new version and verify the update propagates.

**Sources:**
- [web.dev: PWA Update](https://web.dev/learn/pwa/update)

---

### 11. Inconsistent Touch Target Sizes

**Severity:** MEDIUM

**Problem:** Moving from a brutalist desktop design to a mobile-native design often results in touch targets that are too small. WCAG 2.2 requires minimum 24x24px, and Apple HIG recommends 44x44px. Buttons, links, and interactive elements designed for mouse hover do not work well with fingers.

**Prevention:**
1. **Set a project minimum of 44x44px for all interactive elements.** This matches Apple's HIG and works well for thumb interaction.
2. **Use Tailwind's `min-h-11 min-w-11`** (44px) as a base for all buttons and tappable areas.
3. **Add padding to small icons** rather than making the icon itself larger. Use `p-2` or `p-3` around icon buttons.
4. **Test with actual thumbs.** Hold the phone naturally and try to tap every interactive element with your thumb.

---

## Low-Severity Pitfalls

### 12. `will-change` Memory Leak on Always-On Elements

**Severity:** LOW

**Problem:** Applying `will-change: transform` in CSS stylesheets (rather than dynamically via JS) causes the browser to permanently promote elements to compositor layers. On mobile devices with limited GPU memory, this can cause performance degradation -- the opposite of the intended effect.

**Prevention:** Only apply `will-change` via JavaScript immediately before an animation starts, and remove it when the animation completes. Never use it in static CSS for elements that are "sometimes" animated.

**Sources:**
- [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)

---

### 13. Missing `prefers-reduced-motion` Respect

**Severity:** LOW

**Problem:** Some users (including those with vestibular disorders) have "Reduce motion" enabled on their device. Ignoring this setting makes the app inaccessible and can cause discomfort.

**Prevention:**
1. Motion (the library) respects `prefers-reduced-motion` by default when using `animate` prop. Verify this is not overridden.
2. For CSS animations, use:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
3. Test by enabling "Reduce motion" in device accessibility settings.

---

### 14. Over-Animating Everything

**Severity:** LOW

**Problem:** Excitement about the new design system leads to animating every element -- page transitions, list items, cards, buttons, icons. The result is a "junky" feel where nothing feels stable and users get motion fatigue.

**Prevention:**
1. **Animate with purpose.** Every animation should communicate something: state change, hierarchy, direction, feedback.
2. **Keep animations short.** 150-300ms for micro-interactions. 300-500ms for page transitions. Never over 500ms.
3. **Use a consistent easing.** Pick one easing function (e.g., `[0.25, 0.1, 0.25, 1]` or `easeOut`) and use it everywhere.
4. **Rule of thumb:** If removing the animation would not confuse the user about what happened, remove it.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Design system / tokens | Over-engineering tokens that are never reused | Start with 3-5 colors, 2-3 type scales, 1 spacing scale. Expand only when needed. |
| Bottom navigation | Virtual keyboard overlap (#2) | Hide nav when keyboard open. Test on real iOS + Android. |
| Dashboard card redesign | Breaking data display / chart rendering | Keep the data-fetching and rendering logic identical. Only wrap in animation containers. |
| Check-in form renovation | Breaking React Hook Form registration (#7) | Do not change field names, nesting, or form element types. |
| Onboarding flow animations | Hydration mismatch (#6) | Keep animations in thin `"use client"` wrappers. Match initial state to SSR. |
| Meal/workout plan display | RTL direction bugs (#3) | Test every slide/swipe interaction in Arabic locale. |
| Bottom sheets (new component) | iOS scroll lock (#8) | Use the `position: fixed` body-lock pattern or Radix Dialog. |
| Progress/photos page | Large image + animation = jank (#4) | Do not animate image containers. Animate wrappers with `opacity` only. |
| PWA deployment | Stale cache (#10) | Add version-check mechanism before deploying the renovation. |
| All components | Client component creep (#9) | Audit `"use client"` count before and after. Should not increase significantly. |

---

## Pre-Renovation Checklist

Before starting the renovation, set up these guardrails:

- [ ] Establish Playwright visual regression baselines for all pages (both `en` and `ar` locales)
- [ ] Run and record current bundle sizes per route (`next build` output)
- [ ] Ensure all existing E2E and unit tests pass (this is your safety net)
- [ ] Set up Chrome DevTools CPU throttling profiles for testing (4x slowdown)
- [ ] Test current app as installed PWA on a real budget Android device to establish performance baseline
- [ ] Document current `"use client"` component count as a baseline

---

## Sources Summary

- [Motion.dev: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size) -- HIGH confidence
- [Motion.dev: LazyMotion](https://motion.dev/docs/react-lazy-motion) -- HIGH confidence
- [Motion.dev: Animation Performance](https://motion.dev/docs/performance) -- HIGH confidence
- [MDN: VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API) -- HIGH confidence
- [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) -- HIGH confidence
- [MDN: Animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate) -- HIGH confidence
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- HIGH confidence
- [Material Design: Bidirectionality](https://m1.material.io/usability/bidirectionality.html) -- HIGH confidence
- [web.dev: PWA Update](https://web.dev/learn/pwa/update) -- HIGH confidence
- [Ahmad Shadeed: Virtual Keyboard API](https://ishadeed.com/article/virtual-keyboard-api/) -- MEDIUM confidence
- [SitePoint: 60 FPS Animations](https://www.sitepoint.com/achieve-60-fps-mobile-animations-with-css3/) -- MEDIUM confidence
- [Playwright: Visual Comparisons](https://playwright.dev/docs/test-snapshots) -- HIGH confidence
