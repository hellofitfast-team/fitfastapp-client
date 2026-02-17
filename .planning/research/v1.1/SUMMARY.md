# Project Research Summary

**Project:** FitFast v1.1 Mobile UI Renovation
**Domain:** PWA mobile-first UI renovation (fitness coaching, MENA/Egypt market)
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

FitFast v1.1 is a visual-only renovation: same functionality, new mobile-native feel. The existing app uses a brutalist desktop-first design (4px black borders, zero border-radius, sidebar navigation) that needs to transform into a thumb-friendly mobile PWA while preserving the brutalist identity. All four research areas converge on the same conclusion: this is primarily a CSS/Tailwind restructuring problem with two small library additions (Vaul for bottom sheets, react-swipeable for gesture detection), not a framework migration. The total new JS is under 7KB gzipped.

The recommended approach is a "parallel build + swap" strategy where new layout components (bottom nav, mobile header, desktop top nav) are built alongside existing ones, then swapped at the layout level with a single import change. This eliminates risk of breaking the production app during development. The renovation proceeds in four phases: shell/navigation first (the foundation everything sits on), then design token refinement, then page-level renovation of each screen, and finally new primitives for specific features like the check-in wizard and ticket chat.

The top risks are performance on budget Android devices (common in Egypt), virtual keyboard conflicts with fixed bottom navigation, and accidentally breaking the v1.0 RTL audit during component replacement. All three are preventable with upfront guardrails: CPU-throttled testing, keyboard detection hooks, and Playwright visual regression baselines in both English and Arabic locales before starting any work.

## Key Findings

### Recommended Stack Additions

The existing stack (Next.js 16.1.6, React 19, Tailwind v4, shadcn/ui) requires no changes. Only two packages are added.

**New dependencies (total ~5-7KB gzipped):**
- **Vaul** (via `shadcn/ui Drawer`): Bottom sheet/drawer component with native touch gestures and snap points. The canonical choice in the shadcn ecosystem. ~3-5KB.
- **react-swipeable**: Swipe gesture detection for check-in wizard step navigation. Hook-based, zero dependencies. ~1.5KB.

**Explicitly rejected:**
- `motion` / `framer-motion` -- CSS transitions + Tailwind v4 cover all needed animations. 34KB for features not in scope.
- `@use-gesture/react` -- 8KB when react-swipeable does the same at 1.5KB.
- `tailwindcss-animate` -- Tailwind v4 has native animation support; this plugin is for v3.
- Any illustration library -- download 5-8 specific SVGs from unDraw instead.

**Consensus across researchers:** STACK.md and ARCHITECTURE.md independently concluded "no framer-motion." PITFALLS.md validated this by documenting the 34KB bundle cost as the #1 critical pitfall. FEATURES.md mentioned `motion/react` for page transitions and spring animations, but STACK.md and ARCHITECTURE.md overrule this -- CSS handles everything in v1.1 scope.

### Expected Features

**Must have (table stakes for mobile fitness PWA):**
- Bottom navigation bar (floating pill, 4-5 items) -- replaces hamburger menu
- Home screen with greeting, today's plan card, streak indicator, quick-action CTA
- Horizontal day selector for meal/workout plans with collapsible cards
- Step-by-step check-in wizard with progress indicator and swipe navigation
- Skeleton loading screens (replace all spinners)
- Proper empty states with contextual messaging and CTAs per screen
- Pull-to-refresh on all data screens
- Button press feedback (`active:scale-95` + haptic on key actions)
- Safe area handling for iOS notch/home indicator

**Should have (polish, include if time permits):**
- Coach message banner on home screen ("Your coach replied")
- Meal/exercise swap indicators (surface AI alternatives)
- Chat-style ticket conversation bubbles
- Haptic feedback via Vibration API on tab switch, check-in submit
- Scroll-linked fade-in animations on cards
- Badge indicators on nav items (check-in due, unread coach message)

**Defer to v1.2+:**
- Grocery list aggregation view
- Pose guide camera overlay
- Exercise illustration icons
- Live workout tracking / timers
- Page-level route transitions (wait for stable View Transitions API)
- Hide-nav-on-scroll behavior

**Anti-features (explicitly avoid):**
- Social feed / community features
- Calorie logging / food diary
- Real-time activity tracking
- Swipe-between-tabs navigation (conflicts with iOS swipe-back)
- Heavy animation on every element

### Architecture Approach

Single responsive layout with breakpoint switching at `lg` (1024px). Mobile gets bottom nav + compact header; desktop gets horizontal top navbar. The sidebar is fully deprecated. Content components are shared across breakpoints. New components are built in parallel (`dashboard-shell-v2.tsx`) and swapped with a single import change, providing zero-risk rollback.

**Major components:**
1. **DashboardShell (renovated)** -- Responsive container: mobile header + bottom nav below `lg`, desktop top nav at `lg+`
2. **BottomNav** -- Fixed bottom navigation, 5 items, safe-area-aware, hidden when keyboard open
3. **DesktopTopNav** -- Horizontal navbar replacing the 272px sidebar
4. **MobileHeader** -- Simplified: page title + action icons only (no hamburger)
5. **Drawer (Vaul)** -- Bottom sheet for detail views, quick actions, overflow menus
6. **New UI primitives** -- WidgetCard, StepWizard, ChatBubble, FloatingAction, PageHeader

**Design token strategy:** Extend existing `@theme inline` block in globals.css with spacing, shadow, z-index, and safe-area tokens. Keep brutalist radius (0px) everywhere except drawer grab handle. Use named tokens (`--spacing-card`, `--height-bottom-nav`) for recurring component-level values; continue using Tailwind numeric scale for one-off spacing.

### Critical Pitfalls (Top 5)

1. **Animation bundle bloat** -- Do not import `motion` directly. If motion is ever needed, use `m` + `LazyMotion` with `domAnimation` (not `domMax`). For v1.1, CSS-only animations are sufficient. Budget: total animation JS under 20KB gzipped.

2. **Virtual keyboard overlapping bottom nav** -- Hide bottom nav when keyboard opens using `visualViewport` API. Keep submit buttons inline in forms, not fixed to bottom. Add `interactive-widget=resizes-content` to viewport meta tag. Test on real devices.

3. **Breaking RTL during renovation** -- Use Tailwind logical properties exclusively (`ms-*`, `me-*`, `start-*`, `end-*`). Mirror all X-axis animations based on `dir`. Invert swipe gestures in RTL. Establish Playwright visual regression baselines in both locales BEFORE starting.

4. **Animation jank on budget Android** -- Only animate `transform` and `opacity` (GPU-composited). Never animate `width`, `height`, `margin`. Limit to 2-3 simultaneous animations. Test with 4x CPU throttling in DevTools. Respect `prefers-reduced-motion`.

5. **"UI-only" changes breaking logic** -- Preserve semantic HTML elements, `name` attributes, `data-testid` values. Run full test suite after every component renovation. Never restructure React Hook Form field registration. Renovate one component at a time.

## Implications for Roadmap

### Phase 1: Foundation -- Shell and Navigation
**Rationale:** Everything else depends on the navigation structure. The bottom nav, mobile header, and desktop top nav form the container that all page content sits inside. Build this first so all subsequent page renovations render inside the new shell.
**Delivers:** New responsive layout shell with bottom nav (mobile) and top nav (desktop). Sidebar deprecated. Safe area handling. Keyboard-aware nav hiding.
**Addresses:** Bottom navigation bar, safe area handling, floating pill shape, active state animation, badge indicators
**Avoids:** Pitfall #2 (keyboard overlap), Pitfall #5 (viewport height bugs)
**Installs:** Vaul (via shadcn drawer) for the "More" menu bottom sheet

### Phase 2: Design Tokens and Core Primitives
**Rationale:** Before renovating individual pages, the design token vocabulary and reusable primitives must exist. This phase creates the building blocks; subsequent phases consume them.
**Delivers:** Extended `@theme` tokens (spacing, shadow, z-index, safe-area), new UI primitives (WidgetCard, PageHeader, skeleton components), animation keyframes in globals.css
**Addresses:** Skeleton loading system, button press feedback, consistent page headers
**Avoids:** Pitfall #4 (animation jank) by establishing GPU-only animation rules upfront

### Phase 3: Page-Level Renovation
**Rationale:** With shell and primitives ready, renovate each page screen. This is the largest phase and can be parallelized across pages since they are independent.
**Delivers:** Renovated home screen (widget cards, greeting, today's plan), meal plan display (day selector, collapsible cards), workout plan display (matching pattern), tracking/progress pages, ticket conversation view, settings page
**Addresses:** All "must have" features -- home screen widgets, day selectors, collapsed cards, empty states, pull-to-refresh, coach message banner
**Avoids:** Pitfall #3 (RTL breakage) by testing each page in both locales, Pitfall #7 (breaking logic) by preserving form structure
**Sub-phases recommended:** Home -> Meals -> Workouts -> Tickets -> Tracking/Progress -> Settings

### Phase 4: Check-in Wizard and Specialized Features
**Rationale:** The check-in wizard is the most complex renovation (multi-step form with swipe, photo upload, React Hook Form integration). It depends on Phase 2 primitives (StepWizard) and Phase 1 shell. Do it last to benefit from lessons learned on simpler pages.
**Delivers:** Step-by-step check-in wizard with swipe navigation, onboarding flow renovation, chat-style ticket bubbles, floating action button
**Addresses:** Check-in wizard, step progress indicator, swipe gestures, haptic feedback, motivational micro-copy
**Avoids:** Pitfall #7 (breaking form logic), Pitfall #6 (hydration mismatch)
**Installs:** react-swipeable for swipe gesture detection

### Phase 5: RTL Audit and Polish
**Rationale:** RTL must be verified after ALL component renovations are complete, not piecemeal. A dedicated pass ensures nothing was missed and provides the final quality gate.
**Delivers:** Full RTL verification, reduced-motion support, touch target audit (44px minimum), PWA standalone mode testing, stale cache mitigation
**Addresses:** RTL swipe direction handling, Arabic typography verification, prefers-reduced-motion
**Avoids:** Pitfall #3 (RTL breakage), Pitfall #10 (stale cache), Pitfall #11 (touch targets)

### Phase Ordering Rationale

- **Shell before pages:** Pages render inside the shell. Renovating pages before the shell means renovating them twice (once for old shell, once for new).
- **Tokens before pages:** WidgetCard, PageHeader, and skeleton primitives are consumed by every page. Building them first avoids duplication.
- **Simple pages before complex:** Home/meals/workouts are display-only pages. Check-in has form logic and gesture handling. Tackle simpler ones first to validate the renovation approach.
- **RTL audit last:** Testing RTL on incomplete components wastes effort. One comprehensive pass at the end is more efficient.
- **Pre-renovation guardrails:** Before Phase 1 starts, establish Playwright baselines, record bundle sizes, and verify all existing tests pass. This is a prerequisite, not a phase.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Shell/Nav):** Needs research on keyboard detection edge cases across iOS/Android versions. The `visualViewport` API behavior varies.
- **Phase 4 (Check-in Wizard):** Needs research on react-swipeable + React Hook Form integration patterns, and RTL swipe direction inversion.

Phases with standard patterns (skip phase-level research):
- **Phase 2 (Tokens/Primitives):** Pure Tailwind CSS work. Well-documented, zero unknowns.
- **Phase 3 (Page Renovation):** Straightforward component restructuring using established primitives.
- **Phase 5 (RTL Audit):** Follows the same audit pattern used in v1.0 Phase 10. Documented process exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 2 small, well-established packages added. All recommendations verified against official docs and bundle size analysis. |
| Features | MEDIUM-HIGH | Patterns well-established across fitness apps (Hevy, Fitbod, MFP). Implementation specifics verified. Minor uncertainty on which "should have" features fit in timeline. |
| Architecture | HIGH | Based on direct analysis of existing codebase. Parallel build + swap strategy is proven. Tailwind v4 @theme is the official pattern. |
| Pitfalls | HIGH | All pitfalls verified against official MDN/Next.js/Motion docs. Real-world failure modes, not theoretical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Pull-to-refresh implementation:** No researcher specified a concrete library or CSS-only approach. Needs investigation during Phase 2/3 planning. Options: native `overscroll-behavior`, custom hook, or a lightweight library.
- **FEATURES.md mentions `motion/react` for page transitions and spring animations, while STACK.md and ARCHITECTURE.md say CSS-only.** Resolution: CSS-only for v1.1. If specific animations feel inadequate during implementation, motion can be added with LazyMotion as documented in PITFALLS.md. This is a "pull, don't push" decision.
- **Onboarding flow renovation** is mentioned in FEATURES.md but not deeply analyzed in ARCHITECTURE.md. Needs scoping during Phase 4 planning -- how many onboarding screens exist and what needs to change.
- **Budget Android device testing:** No specific device list established. Need to identify 2-3 target devices (Samsung A series, Xiaomi Redmi) before Phase 1 starts.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) -- design token system
- [shadcn/ui Drawer (Vaul)](https://ui.shadcn.com/docs/components/radix/drawer) -- bottom sheet component
- [Vaul GitHub](https://github.com/emilkowalski/vaul) -- drawer implementation details
- [react-swipeable GitHub](https://github.com/FormidableLabs/react-swipeable) -- swipe gesture hook
- [Motion.dev: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size) -- why to avoid full import
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- hydration patterns
- [MDN: VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API) -- keyboard detection
- [MDN: Animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate) -- GPU compositing
- [Material Design: Bidirectionality](https://m1.material.io/usability/bidirectionality.html) -- RTL patterns

### Secondary (MEDIUM confidence)
- [Fitness App UX Best Practices -- Stormotion](https://stormotion.io/blog/fitness-app-ux/) -- feature patterns
- [Bottom Navigation Bar Guide -- AppMySite](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/) -- nav design
- [Ahmad Shadeed: Virtual Keyboard API](https://ishadeed.com/article/virtual-keyboard-api/) -- iOS keyboard behavior
- [SitePoint: 60 FPS Animations](https://www.sitepoint.com/achieve-60-fps-mobile-animations-with-css3/) -- performance techniques
- [unDraw](https://undraw.co/) -- free SVG illustrations for empty states

### Tertiary (LOW confidence)
- [Next.js viewTransition](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) -- experimental, deferred to future version

---
*Research completed: 2026-02-17*
*Ready for roadmap: yes*
