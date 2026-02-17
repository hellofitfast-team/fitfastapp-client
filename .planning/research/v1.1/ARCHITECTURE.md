# Architecture Patterns: FitFast v1.1 Mobile UI Renovation

**Domain:** PWA mobile-first UI renovation for fitness coaching app
**Researched:** 2026-02-17
**Overall Confidence:** HIGH (based on existing codebase analysis + official Tailwind v4 / shadcn docs)

---

## 1. Current Architecture Assessment

### What Exists Today

```
DashboardLayout (server component -- auth/guards)
  -> DashboardShell (client component -- state for sidebar toggle)
       -> Sidebar (client -- 272px fixed sidebar, slide-in on mobile)
       -> Header (client -- sticky top bar, hamburger menu on mobile)
       -> main > {children} (page content)
```

**Current nav pattern:** Desktop = permanent left sidebar (272px). Mobile = hamburger menu opens full sidebar overlay.

**Problems with current approach for mobile:**
- Sidebar is a desktop-first pattern forced onto mobile via overlay
- Hamburger menu requires two taps to reach any nav item (tap hamburger, then tap item)
- No persistent mobile navigation -- users lose spatial orientation
- The sidebar takes 272px of horizontal space on desktop, which is generous but fine
- Header is 64px (h-16) with only menu button + actions -- underutilized on mobile

### Existing Design System

- **Brutalist aesthetic:** 4px black borders, no border-radius, `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- **Colors:** cream background (#FFFEF5), black text, Royal Blue primary (#4169E1)
- **Typography:** System sans-serif (LTR), Cairo (RTL), mono for labels
- **Components:** shadcn/ui primitives already customized to brutalist style (Card, Button, Dialog, etc.)
- **RTL:** Fully supported with `tailwindcss-rtl` and `[dir="rtl"]` CSS rules
- **Animations:** Minimal -- only fadeIn, slideInFromBottom, spin, marquee in globals.css

---

## 2. Recommended Architecture

### 2.1 Single Responsive Layout (NOT Separate Mobile/Desktop)

**Decision: Use ONE layout component with responsive breakpoint switching.**

**Why not separate layouts:**
- Next.js App Router layouts persist across navigations -- you cannot conditionally render different layout trees based on viewport without client-side JS anyway
- Two layout trees means duplicated guard logic, duplicated state, duplicated providers
- Content components are the same -- only the nav chrome changes
- SSR cannot know viewport width, so both would render on the server regardless

**Why single responsive layout works:**
- Tailwind's responsive utilities (`lg:hidden`, `lg:flex`) handle visibility cleanly
- The DashboardShell already does this pattern (sidebar hidden on mobile, visible on desktop)
- We just need to swap *which* nav component is visible at each breakpoint

### 2.2 New Layout Structure

```
DashboardLayout (server component -- unchanged, auth/guards)
  -> DashboardShell (client component -- renovated)
       -> MobileHeader (client -- visible below lg breakpoint)
       -> DesktopTopNav (client -- visible at lg+ breakpoint)
       -> main > {children} (page content, shared)
       -> BottomNav (client -- visible below lg breakpoint)
       -> [Portal: BottomSheet, Dialogs, Toasts]
```

**Key changes from current:**
1. Replace sidebar with **desktop top navbar** (horizontal nav at lg+)
2. Add **mobile bottom navigation** bar (visible below lg)
3. Simplify mobile header (page title + actions only, no hamburger)
4. Content area gains full width on all breakpoints

### 2.3 Breakpoint Strategy

**Use `lg` (1024px) as the primary layout switch point.** This is the existing breakpoint in the codebase (`lg:hidden`, `lg:relative` in sidebar.tsx).

| Breakpoint | Width | Nav Pattern |
|------------|-------|-------------|
| default (mobile) | 0-1023px | Bottom nav (5 primary items) + compact header |
| `lg` (desktop) | 1024+ | Horizontal top navbar with all items |

**Why `lg` not `md` (768px):**
- Tablets in portrait (768-1023px) behave more like phones for thumb reach -- bottom nav is better
- The existing codebase already uses `lg` as the mobile/desktop split
- Keeps consistency with current implementation, reducing refactor scope

### 2.4 Component Hierarchy Diagram

```
src/components/
  layouts/
    index.ts                    # barrel exports
    dashboard-shell.tsx         # RENOVATE: remove sidebar, add responsive nav
    mobile-header.tsx           # NEW: compact header for mobile
    desktop-top-nav.tsx         # NEW: horizontal navbar for desktop
    bottom-nav.tsx              # NEW: fixed bottom navigation for mobile
    header.tsx                  # DEPRECATE (replaced by mobile-header + desktop-top-nav)
    sidebar.tsx                 # DEPRECATE (replaced by desktop-top-nav)
  ui/
    (existing shadcn components)
    drawer.tsx                  # NEW: shadcn/vaul-based bottom sheet
    widget-card.tsx             # NEW: dashboard stat/widget card primitive
    floating-action.tsx         # NEW: FAB button for check-in
    step-wizard.tsx             # NEW: stepped form UI primitive
    chat-bubble.tsx             # NEW: ticket conversation message bubble
    page-header.tsx             # NEW: consistent page title + breadcrumb
```

---

## 3. Design Token Strategy

### 3.1 Extending @theme in globals.css

The current `@theme inline` block defines colors, fonts, and radius. For the renovation, extend it with spacing, shadow, and animation tokens.

**Recommended additions to `@theme inline`:**

```css
@theme inline {
  /* === EXISTING (keep all current tokens) === */

  /* === NEW: Spacing Scale for Components === */
  --spacing-page: 1rem;         /* page-level padding on mobile */
  --spacing-page-lg: 1.5rem;    /* page-level padding on desktop */
  --spacing-card: 1.5rem;       /* internal card padding (currently p-6) */
  --spacing-card-compact: 1rem; /* compact card padding for mobile widgets */
  --spacing-nav: 0.75rem;       /* nav item padding */
  --spacing-section: 2rem;      /* gap between page sections */

  /* === NEW: Shadow Scale === */
  --shadow-brutal-sm: 4px 4px 0px 0px rgba(0,0,0,1);
  --shadow-brutal-md: 8px 8px 0px 0px rgba(0,0,0,1);   /* current default */
  --shadow-brutal-lg: 12px 12px 0px 0px rgba(0,0,0,1);

  /* === NEW: Border Scale === */
  --border-thin: 2px;
  --border-default: 4px;        /* current default throughout */
  --border-thick: 6px;

  /* === NEW: Z-Index Scale === */
  --z-bottom-nav: 40;
  --z-header: 40;
  --z-overlay: 50;
  --z-drawer: 50;
  --z-toast: 60;

  /* === NEW: Safe Area === */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* === NEW: Layout Dimensions === */
  --height-header: 4rem;           /* 64px -- h-16, unchanged */
  --height-bottom-nav: 4rem;       /* 64px bottom nav */
  --height-desktop-nav: 4rem;      /* 64px top nav on desktop */
}
```

**Why named spacing tokens instead of just using Tailwind's numeric scale:**
- `p-[var(--spacing-card)]` is self-documenting -- you know it is card padding
- Changing card padding globally means editing one token, not finding every `p-6`
- The brutalist style has very specific spacing rhythm that should be codified

**However, keep using Tailwind's numeric scale (p-4, gap-2, etc.) for one-off spacing.** The named tokens are for recurring component-level spacing only.

### 3.2 Radius Strategy

The current theme sets ALL radius values to 0 (brutalist). **Keep this.** The renovation should not introduce rounded corners to the main UI.

Exception: The bottom sheet grab handle can use `rounded-full` as a functional affordance (users expect a rounded pill shape to indicate draggable). Override per-component:

```css
.drawer-handle {
  border-radius: 9999px; /* override brutalist 0 for usability */
}
```

---

## 4. Animation Architecture

### 4.1 Decision: CSS Keyframes + Tailwind Utilities (NOT framer-motion)

**Do not add framer-motion.** Reasons:
- The project has zero animation library dependencies today
- framer-motion (now "motion") adds ~30KB+ to client bundle
- The brutalist aesthetic calls for snappy, mechanical transitions -- not spring physics
- CSS animations are sufficient for: slide-in bottom nav, page transitions, drawer open/close
- Vaul (for bottom sheet) brings its own gesture-based animation

**Where to define animations:**

```
globals.css (in existing @keyframes section):
  - slideInFromBottom   (EXISTING -- reuse for bottom sheet content)
  - fadeIn              (EXISTING -- reuse for overlays)
  - slideUpNav          (NEW -- bottom nav entrance)
  - slideDownNav        (NEW -- bottom nav hide on scroll)

Component-level (Tailwind utilities):
  - transition-transform, transition-opacity, duration-200
  - Used inline on components for hover/active states

Vaul (built-in):
  - Bottom sheet drag/snap animations (gesture-driven, no config needed)
```

### 4.2 New Keyframes to Add

```css
@keyframes slideUpNav {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideDownNav {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

.animate-slide-up-nav {
  animation: slideUpNav 0.2s ease-out;
}
```

### 4.3 Page Transitions

For v1.1, **do not implement route-based page transitions.** Next.js App Router does not have built-in View Transitions API support that is stable. The brutalist aesthetic does not need page transitions -- instant content swaps feel intentional and sharp. Revisit if/when Next.js ships stable View Transitions.

---

## 5. Bottom Sheet / Drawer Pattern

### 5.1 Use Vaul via shadcn/ui Drawer

**Library:** `vaul` (already the shadcn/ui recommendation for Drawer component)

**Why Vaul:**
- shadcn/ui has a first-party Drawer component built on Vaul
- Consistent with the existing shadcn/ui component pattern in the project
- Handles touch gestures, snap points, accessibility out of the box
- Tiny footprint (~5KB gzipped)
- Already works with Radix Dialog primitives (same pattern as existing Dialog)

**Installation:**
```bash
pnpm add vaul
# Then add shadcn drawer component (manually, since this project hand-customizes shadcn)
```

### 5.2 Portal vs Nested

**Use Portal (via Vaul's built-in portal behavior).**

Vaul renders drawer content in a portal by default (same as Radix Dialog). This is correct because:
- Bottom sheet must overlay the bottom nav and content area
- Z-index stacking is cleaner with portals
- Focus trapping works correctly
- Scroll locking on body works correctly

**Integration with layout:**

```
DashboardShell
  -> MobileHeader
  -> main > {children}
  -> BottomNav
  -> [Portal layer -- Vaul drawer renders here automatically]
```

The drawer does NOT need to be a child of BottomNav. Any component can trigger it. Vaul handles the portal.

### 5.3 Drawer Customization for Brutalist Style

```tsx
// src/components/ui/drawer.tsx
<Drawer.Content className="
  fixed inset-x-0 bottom-0
  border-t-4 border-x-4 border-black
  bg-cream
  shadow-[0_-8px_0px_0px_rgba(0,0,0,1)]
">
  {/* Grab handle -- only element with border-radius */}
  <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-black" />
  {children}
</Drawer.Content>
```

### 5.4 Snap Points for Common Uses

| Use Case | Snap Points | Example |
|----------|-------------|---------|
| Quick action menu | `["200px", 1]` | Meal swap options |
| Detail view | `["50%", 1]` | Exercise detail in workout plan |
| Form | `[1]` | Check-in form (full screen only) |

---

## 6. Bottom Navigation Design

### 6.1 Component Structure

```tsx
// src/components/layouts/bottom-nav.tsx
"use client";

interface BottomNavProps {
  // No props needed -- reads pathname for active state
}

const NAV_ITEMS = [
  { href: "/", icon: Home, labelKey: "nav.dashboard" },
  { href: "/meal-plan", icon: UtensilsCrossed, labelKey: "nav.mealPlan" },
  { href: "/check-in", icon: ClipboardCheck, labelKey: "nav.checkIn", isPrimary: true },
  { href: "/workout-plan", icon: Dumbbell, labelKey: "nav.workoutPlan" },
  { href: "/progress", icon: TrendingUp, labelKey: "nav.progress" },
];
```

**5 items in bottom nav** (the standard mobile maximum). The remaining items (Tracking, Tickets, FAQ, Settings) move to:
- Desktop top nav: all items visible
- Mobile: accessible via a "More" menu or through the settings/profile area

### 6.2 Layout Integration

```tsx
// Bottom nav fixed positioning with safe area
<nav className="
  fixed inset-x-0 bottom-0
  z-[var(--z-bottom-nav)]
  h-[var(--height-bottom-nav)]
  border-t-4 border-black
  bg-cream
  pb-[var(--safe-area-bottom)]
  lg:hidden
">
```

**Critical: Content area must account for bottom nav height.**

```tsx
// In DashboardShell -- add bottom padding on mobile
<main className="
  flex-1 overflow-y-auto
  pb-[calc(var(--height-bottom-nav)+var(--safe-area-bottom))]
  lg:pb-0
">
```

### 6.3 Active State -- Brutalist Style

```
Inactive: black icon + label on cream background
Active:   cream icon + label on black background (inverted block)
Check-in: primary blue background (always highlighted as CTA)
```

### 6.4 Hide on Scroll (Optional, Deferred)

The bottom nav CAN hide on downward scroll and reappear on upward scroll to reclaim vertical space. **Defer this to a polish pass.** Implementing it requires:
- A scroll direction hook (`useScrollDirection`)
- CSS transform to slide nav down
- Careful handling of momentum scrolling on iOS

For v1.1 initial implementation, keep the bottom nav permanently visible.

---

## 7. Desktop Top Navbar

### 7.1 Replacing the Sidebar

The current sidebar (272px, 9 nav items) becomes a horizontal top navbar on desktop. This is a better use of horizontal space on wide screens and creates visual consistency with the mobile pattern (nav is always at an edge, content fills the rest).

```
+------------------------------------------------------------------+
| [Logo]  Dashboard  Meals  Workout  Check-In  Tracking  Progress  |
|         Tickets    FAQ    Settings                    [AR] [Bell] |
+------------------------------------------------------------------+
|                                                                  |
|                     Page Content                                 |
|                                                                  |
+------------------------------------------------------------------+
```

### 7.2 Component Structure

```tsx
// src/components/layouts/desktop-top-nav.tsx
<nav className="
  hidden lg:flex
  h-[var(--height-desktop-nav)]
  border-b-4 border-black
  bg-cream
  items-center
  justify-between
  px-6
">
  {/* Left: Logo + Nav Links */}
  <div className="flex items-center gap-1">
    <Logo />
    {navItems.map(item => <NavLink key={item.href} {...item} />)}
  </div>
  {/* Right: Lang switch, notifications, user menu */}
  <div className="flex items-center gap-2">
    <LangSwitch />
    <NotificationBell />
    <UserMenu userName={userName} />
  </div>
</nav>
```

### 7.3 Active State

Same brutalist inversion pattern: active link gets `bg-black text-primary` (matching the current sidebar active state). This maintains design language continuity.

---

## 8. Mobile Header (Simplified)

### 8.1 Purpose

On mobile, the header becomes much simpler since navigation moved to the bottom nav:

```
+------------------------------------------+
| [Page Title]              [AR] [Bell] [U] |
+------------------------------------------+
```

No hamburger menu. No logo (logo can go in a dedicated spot or be part of the dashboard page itself). The header shows:
- **Left:** Current page title (dynamic based on route)
- **Right:** Language switch, notifications, user avatar/menu

### 8.2 Page Title Resolution

Use a mapping from pathname to translation key:

```tsx
const PAGE_TITLES: Record<string, string> = {
  "/": "nav.dashboard",
  "/meal-plan": "nav.mealPlan",
  "/workout-plan": "nav.workoutPlan",
  "/check-in": "nav.checkIn",
  // ...
};
```

---

## 9. New UI Primitives

### 9.1 WidgetCard

A lighter-weight card for dashboard stat widgets. Differs from existing Card (which has heavy 4px borders + 8px shadow):

```tsx
// src/components/ui/widget-card.tsx
// Compact card for dashboard grid -- thinner border, smaller shadow
<div className="
  border-2 border-black
  bg-cream
  p-[var(--spacing-card-compact)]
  shadow-[var(--shadow-brutal-sm)]
  transition-colors
  hover:bg-black hover:text-cream
">
```

**When to use:** Dashboard stat grids, quick-glance data. Use existing `Card` for detail views and forms.

### 9.2 FloatingAction (FAB)

A floating action button for the primary CTA (e.g., "New Check-In"):

```tsx
// src/components/ui/floating-action.tsx
// Positioned above bottom nav on mobile, in content area on desktop
<button className="
  fixed
  bottom-[calc(var(--height-bottom-nav)+var(--safe-area-bottom)+1rem)]
  end-4
  z-30
  h-14 w-14
  border-4 border-black
  bg-primary text-white
  shadow-[var(--shadow-brutal-md)]
  hover:bg-black hover:text-primary
  lg:hidden
">
```

**Note:** Only show on mobile. On desktop, the CTA can be a regular button in the page content.

### 9.3 PageHeader

Consistent page title component used at the top of each page's content:

```tsx
// src/components/ui/page-header.tsx
<div className="border-b-4 border-black p-[var(--spacing-page)] lg:p-[var(--spacing-page-lg)]">
  <h1 className="text-2xl font-black uppercase tracking-tight">{title}</h1>
  {subtitle && <p className="font-mono text-xs text-neutral-500 mt-1">{subtitle}</p>}
</div>
```

### 9.4 ChatBubble

For ticket conversations (existing ticket system with coach back-and-forth):

```tsx
// src/components/ui/chat-bubble.tsx
// Two variants: "sent" (client, aligned end) and "received" (coach, aligned start)
<div className={cn(
  "max-w-[80%] border-4 border-black p-4",
  variant === "sent"
    ? "ms-auto bg-primary text-white"
    : "me-auto bg-cream text-black"
)}>
```

### 9.5 StepWizard

For multi-step forms (check-in flow, onboarding). A progress indicator + step container:

```tsx
// src/components/ui/step-wizard.tsx
// Brutalist step indicator: numbered blocks
<div className="flex gap-0">
  {steps.map((step, i) => (
    <div className={cn(
      "flex-1 border-4 border-black p-2 text-center font-mono text-xs font-bold",
      i < currentStep ? "bg-black text-primary" :
      i === currentStep ? "bg-primary text-white" :
      "bg-cream text-neutral-400"
    )}>
      {i + 1}
    </div>
  ))}
</div>
```

---

## 10. Component Refactoring Approach

### 10.1 Strategy: Parallel Build + Swap

**Do NOT edit existing components in-place during development.** Instead:

1. **Build new components alongside existing ones:**
   - `dashboard-shell.tsx` (existing) stays untouched
   - `dashboard-shell-v2.tsx` (new) is developed in parallel
   - `bottom-nav.tsx`, `mobile-header.tsx`, `desktop-top-nav.tsx` are all new files

2. **Swap at the layout level:**
   - The dashboard `layout.tsx` imports from `@/components/layouts`
   - When v2 is ready, change ONE import: `DashboardShell` -> `DashboardShellV2`
   - If something breaks, revert ONE line

3. **Rename after validation:**
   - Once v2 is stable, delete old files and rename v2 -> v1
   - Or keep old files for reference during the transition

**Why this approach:**
- Zero risk of breaking the production app during development
- Easy A/B comparison (toggle import to compare old vs new)
- Page components (dashboard/page.tsx, meal-plan/page.tsx, etc.) need zero changes initially -- they just render inside whatever shell wraps them
- Git diff is clean: new files added, one import changed

### 10.2 Migration Order

1. **Phase A: New shell + nav components** (no page changes)
   - Build: `bottom-nav.tsx`, `mobile-header.tsx`, `desktop-top-nav.tsx`
   - Build: `dashboard-shell-v2.tsx` composing the above
   - Swap layout import
   - All pages render inside new shell without any page-level changes

2. **Phase B: Design token refinement**
   - Add new tokens to `@theme inline`
   - Update existing Card, Button etc. to use token variables where beneficial
   - Add new primitives: `widget-card.tsx`, `page-header.tsx`

3. **Phase C: Page-level renovation**
   - Update individual pages to use new primitives
   - Add `page-header.tsx` to each page
   - Refactor dashboard stats to use `widget-card.tsx`
   - Add bottom sheet interactions where valuable

4. **Phase D: New primitives for specific features**
   - `chat-bubble.tsx` for tickets
   - `step-wizard.tsx` for check-in flow
   - `floating-action.tsx` for mobile CTA

### 10.3 Files to Deprecate

| File | Replaced By | When |
|------|-------------|------|
| `layouts/sidebar.tsx` | `layouts/desktop-top-nav.tsx` | Phase A |
| `layouts/header.tsx` | `layouts/mobile-header.tsx` + `layouts/desktop-top-nav.tsx` | Phase A |
| `layouts/dashboard-shell.tsx` | `layouts/dashboard-shell-v2.tsx` (then renamed) | Phase A |

---

## 11. RTL Considerations for New Components

All new components must work in both LTR and RTL. Key patterns:

| CSS Property | LTR | RTL | Tailwind Utility |
|-------------|-----|-----|-----------------|
| Margin/padding start | `ml-*` | `mr-*` | `ms-*` |
| Margin/padding end | `mr-*` | `ml-*` | `me-*` |
| Border start | `border-l-*` | `border-r-*` | `border-s-*` |
| Border end | `border-r-*` | `border-l-*` | `border-e-*` |
| Position start | `left-*` | `right-*` | `start-*` |
| Position end | `right-*` | `left-*` | `end-*` |
| Text align | `text-left` | `text-right` | `text-start` |

**The existing codebase already uses logical properties (`start-0`, `border-e-4`, `ms-*`).** Continue this pattern in all new components.

**Bottom nav and top nav are symmetric**, so RTL mostly just requires:
- Text direction flips automatically
- Icons with directional meaning (chevrons) need `rtl:rotate-180`

---

## 12. Safe Area and PWA Considerations

### 12.1 iOS Safe Areas

The bottom nav MUST respect `env(safe-area-inset-bottom)` for iPhone notch/home indicator:

```css
/* Already defined as --safe-area-bottom in proposed tokens */
padding-bottom: var(--safe-area-bottom);
```

Also ensure the root HTML has:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 12.2 Standalone PWA Mode

When installed as PWA (`display: standalone`), the browser chrome disappears. The header and bottom nav become the only navigation chrome. Test that:
- Top status bar area is accounted for (`env(safe-area-inset-top)`)
- Bottom nav does not overlap with iOS home indicator
- Android back gesture still works (no custom back button needed -- browser handles it)

---

## 13. Performance Considerations

### 13.1 Client Components

The new layout components (`BottomNav`, `MobileHeader`, `DesktopTopNav`) are all client components (they need `usePathname`, `useTranslations`). This is the same as the current architecture -- `DashboardShell` is already `"use client"`.

**Mitigation:** Keep client components thin. No data fetching in nav components. The layout server component handles all data fetching and passes down only what is needed (userName).

### 13.2 Bundle Impact

| Addition | Estimated Size | Justification |
|----------|---------------|---------------|
| `vaul` (Drawer) | ~5KB gzip | Replaces need for framer-motion entirely |
| New layout components | ~3-4KB total | Replaces existing sidebar + header (~3KB) |
| New UI primitives | ~2-3KB total | Small, focused components |
| **Net change** | **~+5KB** | Vaul is the only new dependency |

### 13.3 Avoiding Layout Shift

The bottom nav and header have fixed heights defined as tokens. Content area uses `pb-[calc(...)]` to account for bottom nav. This prevents content from being hidden behind the fixed nav.

---

## Sources

- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) -- official docs on @theme directive
- [Tailwind CSS v4.0 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 release overview
- [shadcn/ui Drawer (Vaul)](https://ui.shadcn.com/docs/components/radix/drawer) -- official shadcn drawer component
- [Vaul GitHub](https://github.com/emilkowalski/vaul) -- drawer component for React
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) -- App Router layout system
- [Tailwind CSS Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles) -- custom CSS in v4
