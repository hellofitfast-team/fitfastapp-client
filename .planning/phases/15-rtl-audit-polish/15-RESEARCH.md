# Phase 15: RTL Audit and Polish — Research

**Researched:** 2026-02-22
**Domain:** RTL/Bilingual CSS, Accessibility (touch targets), PWA verification
**Confidence:** HIGH — findings are based entirely on direct codebase inspection, not training data

---

## Summary

Phase 15 is a quality-gate phase that audits all **newly renovated components from Phases 11-14** for RTL correctness, accessibility (44px touch targets), and PWA standalone behaviour. It does NOT re-audit the v1.0 codebase — Phase 10 (5 plans, 490/490 translation keys verified) already completed that work.

The existing RTL infrastructure is solid: `<html dir="rtl">` is set at the layout level, Tailwind v4 `rtl:` variants are available, and logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) are used throughout Phase 11+ components. The renovation components introduced in Phases 12-14 are largely RTL-aware but have **six specific, identified issues** that require targeted fixes.

**Primary recommendation:** Fix the six identified issues directly in the five affected files, then run human visual verification in Arabic at 390px and 1440px. No framework changes or new dependencies are needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RTL-05 | All renovated components use logical CSS properties (start/end) — no physical left/right | Six specific violations identified below; fix list is complete |
| RTL-06 | Swipe directions are inverted in Arabic mode and day selector scrolls from right in RTL | react-swipeable not yet in codebase (Phase 14 not started); DaySelector uses overflow-x-auto which browser handles natively for RTL |
| RTL-07 | Localized day labels in DaySelector (not hardcoded English "Day") | Confirmed: day-selector.tsx line 71 has hardcoded "Day {i+1}"; no `common.day` key exists in messages — must add key or use locale conditional |
| RTL-08 | Every renovated page looks correct in Arabic at both 390px and 1440px viewports | Human checkpoint required; automated build check is insufficient |
| VERIFY-01 | All interactive elements have minimum 44px touch targets | Four specific failures identified below |
| VERIFY-02 | No functionality regressions — every feature that worked in v1.0 still works identically | Automated physical property grep + build + human smoke-test checklist |
| VERIFY-03 | PWA standalone mode works with safe areas | manifest.json already has `dir: auto` + `display: standalone`; safe area env() usage verified in shell |
</phase_requirements>

---

## RTL Infrastructure Status (Verified Working)

| Mechanism | Location | Status |
|-----------|----------|--------|
| `dir` attribute on `<html>` | `apps/client/src/app/layout.tsx` | WORKING |
| `rtl:` Tailwind variant | Throughout Phase 11+ components | WORKING |
| Logical margin/padding (`ms-`, `me-`, `ps-`, `pe-`) | Phase 11-12 components | WORKING |
| Logical positioning (`start-`, `end-`) | Phase 11-12 components | WORKING |
| `useLocale()` hook | Available everywhere via next-intl | WORKING |
| Progress bar `dir` attribute | `page.tsx` line 383, `page.tsx` line 252, `settings/page.tsx` line 278 | WORKING |
| ArrowLeft with `rtl:rotate-180` | `tickets/[id]/page.tsx` line 134, 158 | WORKING |
| RTL bubble corners (`isRtl` check) | `tickets/[id]/page.tsx` lines 214, 232 | WORKING |
| Translation key parity | 490/490 keys in sync (verified in Phase 10) | WORKING |

---

## Specific Issues Requiring Fixes

### Issue 1: Hardcoded "Day" Label in DaySelector
**File:** `apps/client/src/app/[locale]/(dashboard)/meal-plan/_components/day-selector.tsx`
**Line:** 71
**Current code:** `<div>Day {i + 1}</div>`
**Problem:** Hardcoded English string in a bilingual app. Arabic users see "Day 1" instead of "يوم 1".
**Impact:** Both meal-plan and workout-plan pages use this component (workout-plan imports from `../meal-plan/_components/day-selector`).
**Fix:** The `common.day` key does NOT exist in en.json/ar.json. Options:
  - A) Add `"day": "Day"` to en.json common and `"day": "يوم"` to ar.json common, then use `t("common.day")`
  - B) Use locale conditional: `locale === "ar" ? "يوم" : "Day"` (simpler, no key addition needed)
  - Recommendation: Option B — avoids polluting message files with a one-character key, and the component already imports `useLocale`.
**Confidence:** HIGH (direct code inspection)

### Issue 2: scrollLeft RTL Bug in Home Page Carousel
**File:** `apps/client/src/app/[locale]/(dashboard)/page.tsx`
**Line:** 71
**Current code:** `const index = Math.round(el.scrollLeft / el.offsetWidth);`
**Problem:** In RTL mode, `scrollLeft` returns negative values in Firefox/Chrome (browser-dependent). The `Math.abs(index)` on line 72 applies after the division — when `scrollLeft` is a large negative number (e.g., -375), dividing first then taking abs gives the correct result in some browsers but not all.
**Fix:** Apply `Math.abs` directly to `el.scrollLeft` before dividing:
```typescript
const index = Math.round(Math.abs(el.scrollLeft) / el.offsetWidth);
setActiveCardIndex(Math.max(0, Math.min(3, index)));
```
**Confidence:** HIGH (MDN documents the cross-browser scrollLeft RTL inconsistency)

### Issue 3: Physical `left-0 right-0` on Photo Overlay
**File:** `apps/client/src/app/[locale]/(dashboard)/progress/_components/photos-tab.tsx`
**Line:** 41
**Current code:** `className="absolute bottom-0 left-0 right-0 bg-black/60 ..."`
**Problem:** `left-0 right-0` are physical properties. For a full-width bottom overlay, the direction-neutral equivalent is `inset-x-0`.
**Fix:** `className="absolute bottom-0 inset-x-0 bg-black/60 ..."`
**Note:** `inset-x-0` sets both `left: 0` and `right: 0` — this is already direction-neutral for a stretch-to-fill-width use case. RTL users will see identical behaviour.
**Confidence:** HIGH (Tailwind docs confirm `inset-x-0 = left-0 right-0`)

### Issue 4: Send Icon Missing RTL Flip
**File:** `apps/client/src/app/[locale]/(dashboard)/tickets/[id]/page.tsx`
**Line:** 270
**Current code:** `<Send className="h-4 w-4" />`
**Problem:** The Send (arrow) icon points right in LTR but should point left in RTL for natural reading direction. The containing button already has `h-10 w-10` (40px) which is close to 44px but technically fails the touch target requirement.
**Fix:** Add `rtl:-scale-x-100` to the Send icon AND increase the button from `h-10 w-10` to `h-11 w-11`:
```tsx
<Send className="h-4 w-4 rtl:-scale-x-100" />
```
```tsx
className="h-11 w-11 shrink-0 rounded-full ..."
```
**Confidence:** HIGH (pattern already used for ArrowLeft at lines 134, 158 in same file)

### Issue 5: Carousel Dot Indicators — Touch Target Too Small
**File:** `apps/client/src/app/[locale]/(dashboard)/page.tsx`
**Lines:** 331-341
**Current code:** Dots are `h-1.5 w-1.5`/`w-4` buttons — 6px visual, no padding, ~6px touch target
**Problem:** 6px is far below the 44px minimum.
**Fix:** Wrap visual dot in a `h-11 w-11` transparent button container:
```tsx
<button
  key={i}
  onClick={() => { scrollToIndex(i); setActiveCardIndex(i); }}
  className="flex items-center justify-center h-11 w-11"
  aria-label={`Go to card ${i + 1}`}
>
  <span className={cn("h-1.5 rounded-full transition-all duration-300",
    activeCardIndex === i ? "w-4 bg-primary" : "w-1.5 bg-neutral-300"
  )} />
</button>
```
**Confidence:** HIGH

### Issue 6: DaySelector RTL Scroll Direction
**File:** `apps/client/src/app/[locale]/(dashboard)/meal-plan/_components/day-selector.tsx`
**Line:** 51
**Current code:** `<div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 ...scrollbar-hide">`
**Status:** Browser natively handles this — flex containers in RTL documents start from the right edge. `overflow-x-auto` with `dir="rtl"` on the parent `<html>` will scroll from right. `scrollIntoView({ inline: "center" })` works correctly in both directions.
**Action needed:** Verification only. No code change required. The browser-native behaviour should be tested manually at 390px viewport in Arabic.
**Confidence:** HIGH (browser specification defines this behaviour)

---

## Touch Target Audit (VERIFY-01)

Minimum 44px requirement:

| Component | File | Current | Status | Fix |
|-----------|------|---------|--------|-----|
| Bottom nav items | `bottom-nav.tsx` | `min-h-[44px]` | PASS | None |
| Bottom nav FAB | `bottom-nav.tsx` | `h-14 w-14` (56px) | PASS | None |
| More button | `more-menu.tsx` | `min-h-[44px]` | PASS | None |
| Mobile header language switcher | `mobile-header.tsx` line 99 | `h-9 w-9` (36px) | **FAIL** | `h-11 w-11` |
| Mobile header notification bell | `mobile-header.tsx` line 108 | `h-9 w-9` (36px) | **FAIL** | `h-11 w-11` |
| Mobile header user menu trigger | `mobile-header.tsx` line 118 | `h-9 w-9` (36px) | **FAIL** | `h-11 w-11` |
| LocaleSwitcher (standalone) | `LocaleSwitcher.tsx` line 20 | `h-10 w-10` (40px) | **BORDERLINE** | `h-11 w-11` |
| DaySelector buttons | `day-selector.tsx` | `min-w-[48px]` + `py-2.5` | PASS | None |
| Carousel dot indicators | `page.tsx` | `h-1.5 w-1.5` (6px) | **FAIL** | Wrap in `h-11 w-11` |
| Send button in tickets | `tickets/[id]/page.tsx` line 265 | `h-10 w-10` (40px) | **BORDERLINE** | `h-11 w-11` |
| FAQ question rows | `faq/page.tsx` | `w-full p-4` | PASS (row is tappable) | Add `min-h-[44px]` explicitly |
| Photo modal close | `photos-tab.tsx` line 68 | `h-9 w-9` (36px) | **FAIL** | `h-11 w-11` |
| Desktop nav icons | `desktop-top-nav.tsx` | various | OK (desktop/mouse) | None |
| Avatar/initials in header | `mobile-header.tsx` | `h-9 w-9` (decorative) | N/A (not interactive) | None |

**Files requiring touch target fixes:** `mobile-header.tsx`, `LocaleSwitcher.tsx`, `page.tsx` (dots), `tickets/[id]/page.tsx` (send button), `photos-tab.tsx` (close button), `faq/page.tsx` (explicit min-h)

---

## PWA Standalone Status (VERIFY-03)

All verified by direct inspection:

| Check | Location | Status |
|-------|----------|--------|
| `"display": "standalone"` | `apps/client/public/manifest.json` | PASS |
| `"dir": "auto"` | `apps/client/public/manifest.json` | PASS |
| `"orientation": "portrait-primary"` | `apps/client/public/manifest.json` | PASS |
| `viewportFit: "cover"` | `apps/client/src/app/layout.tsx` | PASS |
| `appleWebApp.capable: true` | `apps/client/src/app/layout.tsx` | PASS |
| `env(safe-area-inset-bottom)` in shell | `dashboard-shell.tsx` line 36 | PASS |
| `env(safe-area-inset-bottom)` in bottom nav | `bottom-nav.tsx` line 50 | PASS |
| Service Worker registration | `ServiceWorkerRegistration` component | PASS |

**No PWA config changes needed.** Verification only (VERIFY-03 requires human testing on device or Chrome DevTools Application panel).

---

## Translation Key Status

The `common.day` key does NOT currently exist in either `en.json` or `ar.json`. The DaySelector fix (Issue 1) has two implementation choices:

**Option A — Add translation key:**
```json
// en.json → common section
"day": "Day"

// ar.json → common section
"day": "يوم"
```
Then in day-selector.tsx:
```tsx
const t = useTranslations("common");
// ...
<div>{t("day")} {i + 1}</div>
```

**Option B — Locale conditional (recommended):**
```tsx
// Already imports useLocale(), no new imports needed
<div>{locale === "ar" ? `يوم ${i + 1}` : `Day ${i + 1}`}</div>
```

**Recommendation:** Option B. The component already uses `useLocale()`, avoids touching two message files, and keeps the DaySelector self-contained.

---

## Phase 14 Dependency: Swipe RTL (RTL-06)

RTL-06 requires swipe directions to be inverted in Arabic mode. At time of research:

- `react-swipeable` is **not imported anywhere** in the codebase
- Phase 14 (Check-in Wizard) has **not been executed** yet
- Phase 14-01-PLAN.md is listed as planned but not started

**Implication for Plan 15-01:** RTL swipe inversion is conditional on Phase 14 delivering swipe functionality. The plan should:
1. If Phase 14 adds `react-swipeable`: implement RTL direction inversion via `onSwipedLeft`/`onSwipedRight` conditional based on locale
2. If Phase 14 is not yet complete when 15-01 executes: note RTL-06 as "pending Phase 14" and handle reactively

**react-swipeable RTL pattern (for when needed):**
```typescript
import { useSwipeable } from "react-swipeable";
const locale = useLocale();
const isRtl = locale === "ar";

const handlers = useSwipeable({
  onSwipedLeft: () => isRtl ? goToPrev() : goToNext(),
  onSwipedRight: () => isRtl ? goToNext() : goToPrev(),
});
```
**Confidence:** MEDIUM (react-swipeable docs; not yet in codebase)

---

## Phase Plan Structure

Plans are already written. Summary of what each plan does:

### Plan 15-01 (Wave 1, autonomous)
**Files:** `page.tsx`, `loading.tsx`, `meal-plan/_components/day-selector.tsx`, `tickets/[id]/page.tsx`, `progress/_components/photos-tab.tsx`
**Work:**
- Fix carousel `scrollLeft` RTL bug (Math.abs directly on scrollLeft)
- Localize DaySelector "Day" label (locale conditional)
- Add `rtl:-scale-x-100` to Send icon in tickets
- Change `left-0 right-0` to `inset-x-0` on photo overlay
- Rewrite `loading.tsx` skeleton — existing file already uses modern `SkeletonWidgetCard` pattern (NOT brutalist as originally thought; inspect current file before rewriting)

**IMPORTANT:** `loading.tsx` was already rewritten to modern design in a prior session. Current content (verified):
```tsx
import { Skeleton } from "@fitfast/ui/skeleton";
import { SkeletonWidgetCard } from "@fitfast/ui/skeleton";
export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
      <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-7 w-48" /></div>
      <div className="grid grid-cols-2 gap-3">...</div>
      ...
    </div>
  );
}
```
No brutalist artifacts remain. Plan 15-01 should verify the loading skeleton is already correct and **skip the rewrite** if it is.

### Plan 15-02 (Wave 1, autonomous)
**Files:** `mobile-header.tsx`, `LocaleSwitcher.tsx`, `faq/page.tsx`, `photos-tab.tsx`, `page.tsx`
**Work:** Touch target fixes (h-9 w-9 → h-11 w-11, add min-h-[44px], wrap carousel dots)

### Plan 15-03 (Wave 2, checkpoint:human-verify)
**Files:** All 11 dashboard pages + dashboard-shell.tsx
**Work:** Automated physical property grep, build verification, PWA manifest check, safe area verification, then human visual verification in Arabic at 390px and 1440px

---

## Common Pitfalls

### Pitfall 1: loading.tsx Already Fixed
**What goes wrong:** Plan 15-01 says "rewrite loading.tsx from brutalist" but the file was already rewritten in a prior session and now uses modern `SkeletonWidgetCard`. Blindly rewriting would replace working code.
**Prevention:** Read the file first, verify whether it still has `border-black`/`bg-black`. If not, skip the rewrite.

### Pitfall 2: `inset-x-0` Is Not RTL-Specific
**What goes wrong:** Converting `left-0 right-0` to `inset-x-0` is correct for a full-width overlay but `inset-x-0` is also a physical property (sets both left and right to 0). For a truly RTL-aware directional position, you'd use `start-0` or `end-0`. But for a stretch-to-fill-container overlay, `inset-x-0` is correct.
**Prevention:** Only use `start-0`/`end-0` for directional positioning (e.g., icon aligned to the reading-start edge). Use `inset-x-0` for "stretch to fill full width" overlays.

### Pitfall 3: Flex Direction vs. Scroll Direction in RTL
**What goes wrong:** Assuming `overflow-x-auto flex` containers always scroll left-to-right.
**Reality:** When the page has `dir="rtl"`, flex containers render items right-to-left and `overflow-x-auto` starts scrolled at the right edge. `scrollIntoView({ inline: "center" })` works correctly in both directions.
**Prevention:** No code change needed for DaySelector scroll direction — browser handles it.

### Pitfall 4: scrollLeft Cross-Browser in RTL
**What goes wrong:** Assuming `scrollLeft` is always non-negative.
**Reality:** In RTL mode, `scrollLeft` is:
  - Chrome/Edge: positive (but right-edge is the start, so `scrollLeft = 0` means fully scrolled right)
  - Firefox: negative (starts at 0, scrolls towards negative)
  - Safari: positive (same as Chrome)
**Prevention:** Use `Math.abs(el.scrollLeft)` to normalize before dividing.

### Pitfall 5: h-11 Changes Layout Density
**What goes wrong:** Blindly changing `h-9 w-9` to `h-11 w-11` on header icons makes the header taller.
**Reality:** The mobile header has `h-[var(--height-header)]` — fixed height. Icons inside must stay within this height. `h-11` (44px) in a header that's 56-60px tall is fine.
**Prevention:** Verify the icon container is `flex items-center justify-center` — the container grows but the visible icon inside stays `h-4 w-4` or `h-5 w-5`.

---

## Code Examples

### scrollLeft RTL Fix
```typescript
// Source: Direct codebase inspection — page.tsx line 68-73
// BEFORE (broken in RTL):
const index = Math.round(el.scrollLeft / el.offsetWidth);
setActiveCardIndex(Math.max(0, Math.min(3, Math.abs(index))));

// AFTER (correct in all browsers):
const index = Math.round(Math.abs(el.scrollLeft) / el.offsetWidth);
setActiveCardIndex(Math.max(0, Math.min(3, index)));
```

### DaySelector Locale Label
```typescript
// Option B — locale conditional (recommended)
// Component already has: const locale = useLocale();
<div>{locale === "ar" ? `يوم ${i + 1}` : `Day ${i + 1}`}</div>
```

### RTL Icon Flip
```tsx
// Send icon RTL flip (same pattern as ArrowLeft at lines 134, 158)
<Send className="h-4 w-4 rtl:-scale-x-100" />
```

### Touch Target Wrapper for Visual Dots
```tsx
// Wraps tiny visual element in a 44px touch target
<button
  key={i}
  onClick={() => { scrollToIndex(i); setActiveCardIndex(i); }}
  className="flex items-center justify-center h-11 w-11"
  aria-label={`Go to card ${i + 1}`}
>
  <span className={cn(
    "h-1.5 rounded-full transition-all duration-300",
    activeCardIndex === i ? "w-4 bg-primary" : "w-1.5 bg-neutral-300"
  )} />
</button>
```

### Progress Bar with RTL Direction
```tsx
// Pattern already used in page.tsx lines 252, 383 and settings/page.tsx line 278
<div className="h-2 rounded-full bg-neutral-100 overflow-hidden" dir={locale === "ar" ? "rtl" : "ltr"}>
  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
</div>
```

---

## Physical Property Grep Commands

For automated audit in Plan 15-03:

```bash
# Layout physical properties — should return zero in dashboard pages
grep -rn "left-[0-9]\|right-[0-9]\|ml-\[.*\]\|mr-\[.*\]\|pl-\[.*\]\|pr-\[.*\]" \
  apps/client/src/app/\[locale\]/\(dashboard\)/ --include="*.tsx"

# text-left/text-right — should be text-start/text-end
grep -rn "text-left\|text-right" \
  apps/client/src/app/\[locale\]/\(dashboard\)/ --include="*.tsx"

# border-l/border-r — should be border-s/border-e
grep -rn "border-l-\|border-r-" \
  apps/client/src/app/\[locale\]/\(dashboard\)/ --include="*.tsx"

# Remaining brutalist artifacts in loading.tsx (should return zero)
grep -n "border-black\|bg-black\|text-black" \
  apps/client/src/app/\[locale\]/\(dashboard\)/loading.tsx
```

**Exceptions — OK to leave as physical:**
- `rounded-lg`, `rounded-xl`, `rounded-2xl` — all-corners, not directional
- `left-0 right-0` already converted to `inset-x-0` (full-width overlays)
- `translate-x`, `scale-x` — transforms, not layout
- Radix/shadcn animation classes (`slide-in-from-left`) — library handles RTL internally
- `"en-US"` / `"ar-u-nu-latn"` inside locale conditionals — correct locale-aware formatting

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all affected files
- `apps/client/src/app/[locale]/(dashboard)/page.tsx` — carousel scroll, progress bars
- `apps/client/src/app/[locale]/(dashboard)/meal-plan/_components/day-selector.tsx` — day label issue
- `apps/client/src/app/[locale]/(dashboard)/tickets/[id]/page.tsx` — Send icon, bubble corners
- `apps/client/src/app/[locale]/(dashboard)/progress/_components/photos-tab.tsx` — physical left/right, close button
- `apps/client/src/components/layouts/mobile-header.tsx` — touch targets
- `apps/client/src/components/auth/LocaleSwitcher.tsx` — touch target
- `apps/client/src/messages/en.json` — confirmed `common.day` key does not exist
- `.planning/milestones/v1.0-phases/10-rtl-audit/10-VERIFICATION.md` — Phase 10 what was already fixed

### Secondary (MEDIUM confidence)
- MDN Web Docs: `scrollLeft` in RTL documents returns negative values in some browsers
- W3C/WCAG: 44×44 CSS pixel minimum touch target (WCAG 2.5.5)

---

## Metadata

**Confidence breakdown:**
- Issue identification: HIGH — all six issues found via direct file inspection
- Fix implementations: HIGH — patterns verified in same files or immediate neighbours
- Touch target audit: HIGH — px values read directly from source
- PWA status: HIGH — manifest.json and layout.tsx read directly
- RTL-06 (swipe): MEDIUM — Phase 14 dependency not yet executed

**Research date:** 2026-02-22
**Valid until:** Until Phase 13 and Phase 14 execute (may introduce new components to audit)
