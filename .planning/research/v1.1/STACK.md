# Technology Stack: v1.1 Mobile UI Renovation

**Project:** FitFast Mobile UI Renovation
**Researched:** 2026-02-17
**Overall Confidence:** HIGH (mostly CSS/Tailwind work + well-established libraries)

## Current Stack (No Changes)

These stay exactly as-is:

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.1.6 | Framework (App Router) |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4.1.18 | Styling |
| shadcn/ui | (copy-paste) | Component primitives |
| next-intl | 4.8.2 | i18n (EN + AR/RTL) |
| SWR / Zustand | 2.4 / latest | State management |
| Radix UI | various | Accessible primitives |
| lucide-react | 0.563 | Icons |

## Recommended Additions

### 1. Animation/Transitions: CSS-only (NO library needed)

**Recommendation:** Use CSS transitions, CSS animations, and Tailwind v4's built-in animation utilities. Do NOT add `motion` (formerly framer-motion).

**Rationale:**
- The renovation needs page transitions (fade/slide), card entrance animations, and micro-interactions (button press, tab switch). These are all achievable with CSS transitions + `@keyframes`.
- `motion` (the renamed framer-motion) adds ~34KB min+gzip for the full bundle, or ~4.6KB with LazyMotion. Even 4.6KB is unnecessary weight for what CSS handles natively.
- The project already has `animate-fade-in` and `animate-slide-in` CSS keyframes in `globals.css`. Extend this pattern.
- React 19's `<ViewTransition>` component is available (experimental in Next.js 16.1.6 via `experimental: { viewTransition: true }`). This provides native page-level transitions with zero JS bundle cost. It is marked experimental but works for same-document transitions in Chrome, Edge, and Safari 18+.

**What to use instead:**
```css
/* In globals.css - extend existing pattern */
@keyframes slideUp { ... }
@keyframes scaleIn { ... }
@keyframes slideInFromLeft { ... }
@keyframes slideInFromRight { ... }
```

Plus Tailwind v4 utilities:
```html
<div class="transition-all duration-300 ease-out">
```

**Confidence:** HIGH. CSS animations cover 100% of the needed transitions for this renovation. Motion library is overkill.

**When you WOULD need motion:** Drag-to-reorder, spring physics, shared layout animations across routes. None of these are in the v1.1 scope.

---

### 2. Bottom Sheet/Drawer: Vaul (via shadcn/ui Drawer)

**Recommendation:** Install the shadcn/ui Drawer component, which wraps [Vaul](https://github.com/emilkowalski/vaul) by Emil Kowalski.

**Rationale:**
- shadcn/ui already has a [Drawer component](https://ui.shadcn.com/docs/components/radix/drawer) built on Vaul. Since FitFast already uses shadcn/ui primitives, this is the natural choice.
- Vaul is purpose-built for mobile bottom sheets with native-feeling touch/drag gestures, snap points, and physics-based animations.
- Bundle size: ~3-5KB gzip (Vaul itself is lightweight; the only dependency is Radix Dialog which FitFast already has installed).
- React 19 compatible.
- Active maintenance by Emil Kowalski (shadcn ecosystem).

**Installation:**
```bash
npx shadcn@latest add drawer
```

This copies the Drawer component into `src/components/ui/drawer.tsx` and adds `vaul` as a dependency. No other changes needed.

**Use cases in renovation:**
- Check-in detail view on mobile
- Meal/workout plan day detail
- Quick-action menus
- Filter/sort panels

**Confidence:** HIGH. This is the canonical choice in the shadcn ecosystem.

---

### 3. Swipe Gestures: react-swipeable

**Recommendation:** Use [react-swipeable](https://github.com/FormidableLabs/react-swipeable) for the check-in form step navigation.

**Rationale:**
- ~1.5KB gzip, zero dependencies, hook-based API.
- Only need swipe left/right detection for the multi-step check-in form. This is all react-swipeable does -- it is laser-focused on swipe detection.
- Alternative `@use-gesture/react` (~8KB gzip) is more powerful but handles pinch, drag, scroll, wheel, move, and hover -- all unnecessary for this use case.
- React 19 compatible (hook-based, no class components).
- Actively maintained by NearForm (formerly Formidable Labs).

**Usage pattern:**
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => goToNextStep(),
  onSwipedRight: () => goToPrevStep(),
  trackMouse: false, // touch only for mobile
  delta: 50, // minimum swipe distance
});

return <div {...handlers}>{/* step content */}</div>;
```

**Installation:**
```bash
pnpm add react-swipeable
```

**Confidence:** HIGH. Well-established, tiny, does exactly what is needed.

---

### 4. Bottom Navigation: Pure Tailwind/CSS (NO library needed)

**Recommendation:** Build the floating pill-shaped bottom nav as a custom component using Tailwind CSS classes. No library needed.

**Rationale:**
- A bottom nav bar is a `fixed bottom-4` div with `rounded-full` (after we update the radius tokens), `backdrop-blur`, and flex layout. This is 20-30 lines of Tailwind.
- No library exists that would meaningfully simplify this. Navigation bar libraries tend to be opinionated about routing, which conflicts with Next.js App Router.
- The pill shape with active indicator is a styling concern, not a behavior concern.

**Implementation approach:**
```tsx
// src/components/navigation/bottom-nav.tsx
<nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
  bg-white/80 backdrop-blur-xl rounded-full shadow-lg
  border border-neutral-200 px-2 py-1
  flex items-center gap-1">
  {items.map(item => (
    <NavItem key={item.href} active={isActive} {...item} />
  ))}
</nav>
```

**Key Tailwind classes:**
- `rounded-full` -- pill shape (requires updating radius tokens for nav only, use inline override)
- `backdrop-blur-xl` -- frosted glass effect
- `fixed bottom-4 inset-x-4` -- floating position
- `safe-area-inset-bottom` -- respect notch/home indicator via `pb-[env(safe-area-inset-bottom)]`

**Confidence:** HIGH. This is fundamentally a CSS layout problem.

---

### 5. Empty State Illustrations: Static SVGs from unDraw/Humaaans

**Recommendation:** Use hand-picked SVG illustrations from [unDraw](https://undraw.co/) (free, MIT license). Download 5-8 fitness/health themed SVGs, customize colors to match the new theme, and store as static assets.

**Rationale:**
- DO NOT install an illustration library. They are massive (hundreds of SVGs bundled) and you only need 5-8 specific ones.
- unDraw has fitness, health, and wellness themed illustrations. Download the specific SVGs needed:
  - Empty dashboard (person with chart)
  - No meals (cooking/food)
  - No workouts (exercise/fitness)
  - No check-ins (calendar/clipboard)
  - Error state (warning/oops)
- Customize the accent color to match the new primary color before saving.
- Store in `/public/illustrations/` as static SVGs. Each SVG is ~5-15KB.
- Alternative: [Humaaans](https://www.humaaans.com/) for mix-and-match people illustrations (also free).

**Implementation:**
```tsx
// In empty-state.tsx
<Image
  src={`/illustrations/${illustrationName}.svg`}
  alt=""
  width={200}
  height={200}
  className="mx-auto mb-4 opacity-80"
/>
```

**Confidence:** HIGH. Standard approach. No runtime cost.

---

### 6. Design Tokens: Tailwind v4 @theme (already in use, extend it)

**Recommendation:** Restructure the existing `@theme` block in `globals.css` to support the new modern design system. No new tooling needed -- Tailwind v4's CSS-first `@theme` directive is the design token system.

**Rationale:**
- FitFast already uses `@theme inline { ... }` in `globals.css`. This is the correct Tailwind v4 pattern.
- The renovation needs to change token VALUES (not the system): rounded corners instead of 0, softer shadows instead of brutalist offsets, new color palette.
- All tokens defined in `@theme` are automatically available as CSS custom properties at runtime, enabling dynamic theming if needed later.

**Token changes for the renovation:**
```css
@theme inline {
  /* NEW: Modern rounded corners (replacing brutalist 0px) */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* NEW: Soft shadows (replacing 8px black offset) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* NEW: Modern color palette (replacing brutalist) */
  --color-background: #FFFFFF;
  --color-foreground: #1A1A2E;
  --color-card: #FFFFFF;
  --color-border: #E5E7EB;
  /* ... etc */
}
```

**Confidence:** HIGH. This is how Tailwind v4 is designed to work.

---

### 7. Responsive Approach: Tailwind v4 Mobile-First (already supported)

**Recommendation:** Use Tailwind's built-in responsive prefixes with a mobile-first approach. No new tooling.

**Approach:**
- Default styles = mobile (no prefix)
- `md:` prefix = tablet/desktop overrides
- Hide bottom nav on `md:` and show top navbar instead
- Use CSS Container Queries (native in Tailwind v4 via `@container`) for component-level responsiveness where needed

**Key patterns:**
```tsx
{/* Bottom nav: visible on mobile, hidden on desktop */}
<BottomNav className="md:hidden" />

{/* Top nav: hidden on mobile, visible on desktop */}
<TopNav className="hidden md:flex" />

{/* Content area: full width mobile, constrained desktop */}
<main className="px-4 md:px-8 md:max-w-4xl md:mx-auto">
```

**Safe area handling for PWA:**
```css
/* In globals.css */
@supports (padding: env(safe-area-inset-bottom)) {
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

Add to `<meta name="viewport">`:
```
viewport-fit=cover
```

**Confidence:** HIGH. Standard Tailwind responsive design.

---

## Summary: What to Install

| Package | Size (gzip) | Purpose | Confidence |
|---------|-------------|---------|------------|
| `vaul` (via shadcn drawer) | ~3-5KB | Bottom sheet/drawer | HIGH |
| `react-swipeable` | ~1.5KB | Swipe gestures for check-in steps | HIGH |

**Total new JS added: ~5-7KB gzip**

## What NOT to Install

| Package | Why Not |
|---------|---------|
| `motion` / `framer-motion` | CSS transitions + Tailwind cover all needed animations. 34KB for features we do not need. |
| `@use-gesture/react` | 8KB when react-swipeable does the same job at 1.5KB. |
| `react-spring-bottom-sheet` | Unmaintained since 2022. Vaul is the successor. |
| `@radix-ui/react-navigation-menu` | Designed for dropdown nav menus, not bottom tab bars. |
| Any illustration library | Download specific SVGs instead of bundling hundreds. |
| `tailwindcss-animate` | Tailwind v4 has native animation support. This plugin is for v3. |
| CSS-in-JS (styled-components, emotion) | Already committed to Tailwind. Adding CSS-in-JS would be architectural confusion. |

## Optional Future Consideration

| Package | When to Consider |
|---------|-----------------|
| `motion` (LazyMotion) | If v1.2+ needs drag-to-reorder workout exercises, shared layout animations, or spring physics. Not needed for v1.1. |
| Next.js `viewTransition` | When it exits experimental status. Currently works but officially "not recommended for production." Monitor for Next.js 17. |

## Installation Commands

```bash
# Add vaul via shadcn drawer component
npx shadcn@latest add drawer

# Add swipe gesture support
pnpm add react-swipeable
```

## Sources

- [Motion bundle size docs](https://motion.dev/docs/react-reduce-bundle-size) - LazyMotion optimization details
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) - framer-motion to motion/react rename
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/radix/drawer) - Built on Vaul
- [Vaul GitHub](https://github.com/emilkowalski/vaul) - Drawer component for React
- [react-swipeable GitHub](https://github.com/FormidableLabs/react-swipeable) - Swipe event handler hook
- [Tailwind v4 @theme docs](https://tailwindcss.com/docs/theme) - CSS-first design tokens
- [Next.js viewTransition](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) - Experimental, not production-ready
- [unDraw](https://undraw.co/) - Free SVG illustrations (MIT license)
- [Humaaans](https://www.humaaans.com/) - Mix-and-match people illustrations
