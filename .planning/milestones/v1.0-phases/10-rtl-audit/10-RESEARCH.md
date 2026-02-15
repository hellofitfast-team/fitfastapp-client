# Phase 10: RTL Audit - Research

**Researched:** 2026-02-15
**Domain:** Right-to-Left (RTL) UI/UX for Arabic localization in Next.js applications
**Confidence:** HIGH

## Summary

RTL audit requires systematic review of UI components, layout patterns, and locale-specific formatting to ensure Arabic users have an equivalent experience to English users. The FitFast application uses next-intl 4.8.2 for internationalization and has basic RTL infrastructure (dir attribute, Cairo font, basic CSS) but lacks proper implementation of locale-aware formatting and directional UI elements.

**Key findings:**
1. **shadcn/ui now has official RTL support** (January 2026) with automated CLI migration that converts physical properties (ml-*, right-*) to logical properties (ms-*, end-*)
2. **Eastern Arabic numerals (٠-٩) vs Western (0-9)** is a locale-specific setting in JavaScript's Intl API using the `nu` extension key or locale codes like `ar-EG` vs `ar-SA`
3. **Progress bars and directional UI elements** require explicit RTL handling - inline styles with `width: X%` don't automatically flip
4. **Date formatting is currently hardcoded to "en-US"** in multiple components, bypassing the app's bilingual design
5. **Recharts has known RTL issues** with tooltips and axis labels requiring workarounds

**Primary recommendation:** Use shadcn's RTL migration CLI (`pnpm dlx shadcn@latest migrate rtl`) to convert all UI components to logical properties, then systematically audit each route for locale-aware formatting and directional UI elements.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 4.8.2 | i18n framework for Next.js | Official Next.js i18n solution with built-in hooks (useLocale, useFormatter) for locale-aware formatting |
| tailwindcss-rtl | 0.9.0 | Tailwind RTL utilities | Adds rtl: variants and logical property utilities for bidirectional layouts |
| Intl.NumberFormat | Native JS API | Number formatting | Built-in locale-aware number formatting with Eastern/Western Arabic numeral support |
| Intl.DateTimeFormat | Native JS API | Date/time formatting | Built-in locale-aware date formatting |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| i18n-check | Latest | Translation validation CLI | Pre-deployment audits to find missing translation keys |
| @radix-ui/* | Current | UI primitives with dir prop | All shadcn/ui components support direction prop for portals |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tailwindcss-rtl | CSS logical properties only | Modern approach but requires manual conversion of all existing styles |
| shadcn RTL migration | Manual logical property conversion | More control but high effort and error-prone |
| Eastern Arabic numerals (default) | Western numerals in Arabic | Many Arabic-speaking countries use Western numerals (Egypt uses ٠-٩, but UAE/KSA often use 0-9) |

**Installation:**
```bash
# RTL migration for shadcn components (REQUIRED)
pnpm dlx shadcn@latest migrate rtl src/components/ui

# Add direction component and provider
pnpm dlx shadcn@latest add direction

# Translation validation tool (optional but recommended)
pnpm add -D i18n-check
```

## Architecture Patterns

### Recommended Audit Structure
```
10-rtl-audit/
├── 10-01-PLAN.md        # shadcn RTL migration + logical properties
├── 10-02-PLAN.md        # Locale-aware date/number formatting
├── 10-03-PLAN.md        # Directional UI (progress bars, arrows, steppers)
├── 10-04-PLAN.md        # Translation key audit + missing key validation
├── 10-05-PLAN.md        # Visual regression testing across all routes
```

### Pattern 1: Locale-Aware Formatting with next-intl Hooks

**What:** Use next-intl's `useLocale()` and `useFormatter()` hooks in client components for locale-specific formatting instead of hardcoded locales.

**When to use:** All client components that display dates, numbers, percentages, or measurements.

**Example:**
```typescript
// ❌ BAD: Hardcoded locale
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

// ✅ GOOD: Locale-aware with next-intl
"use client";
import { useLocale, useFormatter } from "next-intl";

export function DateDisplay({ date }: { date: string }) {
  const locale = useLocale();
  const format = useFormatter();

  return (
    <time dateTime={date}>
      {format.dateTime(new Date(date), {
        year: "numeric",
        month: "short",
        day: "numeric"
      })}
    </time>
  );
}
```

**Source:** [next-intl Date and Time Formatting](https://next-intl.dev/docs/usage/dates-times)

### Pattern 2: Logical Properties for RTL

**What:** Replace physical directional classes (ml-4, right-0, border-r-4) with logical equivalents (ms-4, end-0, border-e-4).

**When to use:** All UI components with directional styles.

**Example:**
```tsx
// ❌ BAD: Physical properties
<div className="border-r-4 border-black ml-6 text-left">

// ✅ GOOD: Logical properties
<div className="border-e-4 border-black ms-6 text-start">
```

**shadcn/ui January 2026 RTL Update:**
- CLI automatically converts physical → logical at install time
- Components need `rtl: true` in components.json
- Manual migration: `pnpm dlx shadcn@latest migrate rtl [path]`

**Source:** [shadcn/ui RTL Documentation](https://ui.shadcn.com/docs/rtl)

### Pattern 3: RTL-Aware Progress Bars

**What:** Progress bars must fill from right-to-left in Arabic using directional logic, not just `width: X%`.

**When to use:** All horizontal progress indicators (bars, timelines, steppers).

**Example:**
```tsx
// ❌ BAD: Always fills left-to-right
<div className="h-6 border-4 border-black bg-neutral-100">
  <div
    className="h-full bg-success-500 transition-all"
    style={{ width: `${percentage}%` }}
  />
</div>

// ✅ GOOD: Fills from start direction
"use client";
import { useLocale } from "next-intl";

export function ProgressBar({ percentage }: { percentage: number }) {
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <div className="h-6 border-4 border-black bg-neutral-100" dir={isRTL ? "rtl" : "ltr"}>
      <div
        className="h-full bg-success-500 transition-all"
        style={{
          width: `${percentage}%`,
          // Ensure fill starts from the correct direction
          marginInlineStart: 0,
          marginInlineEnd: "auto"
        }}
      />
    </div>
  );
}
```

**Alternative approach using transform:**
```tsx
// For circular progress (SVG), flip the entire element
<svg className={cn("transform", locale === "ar" && "-scale-x-100")}>
  {/* circle elements */}
</svg>
```

### Pattern 4: Eastern Arabic Numerals Configuration

**What:** Choose between Western (0-9) and Eastern (٠-٩) Arabic numerals based on target market.

**When to use:** All number formatting decisions - Egypt typically uses Eastern, Gulf states often use Western.

**Example:**
```typescript
// Eastern Arabic numerals (٠-٩) - Egypt
new Intl.NumberFormat("ar-EG").format(1234)
// → ١٬٢٣٤

// Western numerals in Arabic (0-9) - UAE/Saudi
new Intl.NumberFormat("ar-SA").format(1234)
// → 1,234

// Force Western numerals with nu extension
new Intl.NumberFormat("ar-u-nu-latn").format(1234)
// → 1,234

// Force Eastern numerals with nu extension
new Intl.NumberFormat("ar-u-nu-arab").format(1234)
// → ١٬٢٣٤
```

**Source:** [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

### Pattern 5: Directional Icon Flipping

**What:** Some icons should flip in RTL (arrows, chevrons), others should not (play buttons, phone icons).

**When to use:** Any icon with inherent directionality.

**Example:**
```tsx
// Icons that SHOULD flip
<ChevronRight className="rtl:rotate-180" />
<ArrowRight className="rtl:rotate-180" />

// Icons that should NOT flip
<Play className="" /> {/* Media controls always LTR */}
<Phone className="" /> {/* Universal orientation */}
<Search className="" /> {/* Universal orientation */}
```

**Rule of thumb:**
- Navigation arrows: Flip
- Media controls: Don't flip
- Circular refresh arrows: Don't flip (universal clockwise)
- Checkmarks in progress: Don't flip (universal)

**Source:** [Localization Station: RTL Product Launch Guide](https://www.localizationstation.com/posts/how-to-launch-an-rtl-version-of-your-product-and-survive)

### Anti-Patterns to Avoid

- **"Just flip it" mentality:** Not everything mirrors - media controls, logos, phone numbers stay LTR
- **Hardcoding locale strings:** Always derive from `useLocale()` hook, never assume "en" or "ar"
- **Ignoring bidirectional content:** English brand names in Arabic sentences need special handling (Unicode bidi algorithm handles most cases)
- **Same font size for Arabic and English:** Arabic needs 1-2px larger for same legibility due to complex glyphs
- **Using letter-spacing on Arabic text:** Arabic script doesn't use letter-spacing - already handled in globals.css but verify in custom styles

**Source:** [Reffine: RTL Website Design Mistakes & Best Practices](https://www.reffine.com/en/blog/rtl-website-design-and-development-mistakes-best-practices)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting | Custom locale switcher for numerals | `Intl.NumberFormat` with locale from `useLocale()` | Handles thousands separators, decimal points, numeral systems automatically |
| Date formatting | String manipulation with locale checks | `useFormatter().dateTime()` from next-intl | Handles month names, weekday names, calendar systems, relative dates |
| RTL direction detection | Manual dir attribute setting per component | `useLocale()` + `dir` attribute on root html (already set) | Centralized in layout.tsx, components inherit automatically |
| Logical property conversion | Manual find/replace of ml-* to ms-* | `shadcn migrate rtl` CLI command | Automated, covers all edge cases, maintains shadcn component structure |
| Translation key validation | Manual JSON diff | i18n-check CLI tool | Finds missing keys, unused keys, validates structure |
| RTL visual testing | Manual screenshot comparison | Browser DevTools with `--force-ui-direction=rtl` flag + Playwright | Systematic, reproducible, catches layout breaks |

**Key insight:** RTL is not just "flip everything" - it's a complex matrix of what to mirror, what to keep, and what to adapt. Use existing tools that encode these rules rather than building custom logic that inevitably misses edge cases.

## Common Pitfalls

### Pitfall 1: Progress Bars Fill Wrong Direction
**What goes wrong:** Progress bars use `width: X%` which always fills left-to-right regardless of `dir` attribute.

**Why it happens:** CSS width property is not direction-aware - it always expands from the left edge of the container.

**How to avoid:**
- Wrap progress bar in container with explicit `dir` attribute
- Use `margin-inline-start: 0` and `margin-inline-end: auto` to anchor fill to start direction
- For SVG circular progress, apply `transform: scaleX(-1)` in RTL to flip entire element

**Warning signs:**
- Progress bar in Arabic appears to "drain" instead of fill
- Users report progress moving backward
- Circular progress indicators have checkmark on wrong side

**Example from codebase:** `/src/components/charts/ProgressCharts.tsx` lines 109 and 123 use inline width styles without RTL handling.

**Source:** Research finding from codebase analysis

### Pitfall 2: Hardcoded Locale Strings in Date Formatting
**What goes wrong:** Components hardcode "en-US" in `toLocaleDateString()` calls, showing English dates in Arabic interface.

**Why it happens:** Developers test in English and forget to parameterize locale, or aren't aware of `useLocale()` hook in next-intl.

**How to avoid:**
- Global rule: NEVER hardcode locale strings ("en-US", "ar-EG")
- Always use `useLocale()` hook in client components
- Use `useFormatter()` for consistent date/number formatting
- Create utility wrapper functions that automatically inject locale

**Warning signs:**
- English date format (MM/DD/YYYY) appears in Arabic view
- Month names in English while rest of UI is Arabic
- Date picker doesn't match locale format

**Example from codebase:**
- `/src/app/[locale]/(dashboard)/tickets/page.tsx` line 112
- `/src/app/[locale]/(dashboard)/tickets/[id]/page.tsx` line 91

**Source:** Research finding from codebase analysis + STATE.md pending todos

### Pitfall 3: Western vs Eastern Arabic Numerals Confusion
**What goes wrong:** App displays Western numerals (0-9) in Arabic, but stakeholders expected Eastern numerals (٠-٩), or vice versa.

**Why it happens:** Different Arabic-speaking regions have different numeral preferences - Egypt uses Eastern, Gulf states often use Western. JavaScript defaults to Western for generic "ar" locale.

**How to avoid:**
- **Decision required:** Confirm with coach/stakeholders which numeral system to use
- Use specific locale codes: "ar-EG" for Eastern, "ar-SA" for Western, or "ar-u-nu-latn" to force Western
- Document decision in environment variables or config file
- Test with stakeholders early - numeral preference is cultural, not technical

**Warning signs:**
- Stakeholder feedback: "Numbers look wrong in Arabic"
- Users mixing Eastern/Western numerals when entering data
- Inconsistent numeral display across different components

**Source:**
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Will Code for Beer: Using Intl with Hindi and Arabic Numbers](https://willcodefor.beer/posts/intlu)

### Pitfall 4: Physical Properties Breaking Layout in RTL
**What goes wrong:** UI elements appear in wrong positions (buttons on wrong side, borders on wrong edge, overlapping elements).

**Why it happens:** Tailwind classes like `ml-4`, `right-0`, `border-r-4` are physical properties that don't flip with `dir="rtl"`.

**How to avoid:**
- Run `pnpm dlx shadcn@latest migrate rtl src/components/ui` to auto-convert shadcn components
- Enable `rtl: true` in components.json for future component additions
- Use logical properties in custom components: ms-*/me-* for margin, start-*/end-* for position, border-s-*/border-e-* for borders
- Code review checklist: Flag any physical directional classes (ml-, mr-, pl-, pr-, left-, right-, border-l-, border-r-)

**Warning signs:**
- Dropdown menus appear off-screen in Arabic
- Icons on wrong side of buttons
- Borders appear on wrong edge
- Absolute positioned elements in wrong corners

**Example from codebase:** `/src/components/ui/tabs.tsx` uses `border-r-4` and `last:border-r-0` which won't flip in RTL.

**Source:** [shadcn/ui RTL Migration Documentation](https://ui.shadcn.com/docs/rtl)

### Pitfall 5: Missing Translation Keys Not Caught Until Production
**What goes wrong:** Raw fallback text or translation keys like "dashboard.title" appear in UI because key is missing from ar.json.

**Why it happens:**
- Developer adds new feature with English translations only
- Key added to en.json but forgotten in ar.json
- Typo in translation key name
- No automated validation in CI/CD pipeline

**How to avoid:**
- Install i18n-check: `pnpm add -D i18n-check`
- Add npm script: `"i18n:check": "i18n-check -l src/messages -s en -u src/ -f next-intl"`
- Run in pre-commit hook or CI/CD pipeline
- Use TypeScript strict mode with next-intl's type generation (add `typescript: true` to messages config)
- Manual audit: grep codebase for `useTranslations("namespace")` and verify all used keys exist in both en.json and ar.json

**Warning signs:**
- Stakeholder reports "English text appearing in Arabic version"
- Translation keys visible as raw strings (e.g., "dashboard.title" instead of actual title)
- Console warnings: "Missing message" from next-intl
- Different number of keys between en.json (602 lines) and ar.json (602 lines) - wait, they match! But need to verify CONTENT, not just line count

**Source:** [next-intl Translation Validation](https://next-intl.dev/docs/workflows/messages)

### Pitfall 6: Recharts Components Not RTL-Aware
**What goes wrong:** Chart tooltips appear in wrong position, axis labels don't flip, bar chart order is reversed.

**Why it happens:** Recharts doesn't have built-in RTL support - it assumes LTR layout for X/Y axes, tooltips, and legends.

**How to avoid:**
- Wrap charts in container with explicit `dir="ltr"` if data should always flow left-to-right (time series, sequential data)
- For charts that should flip (progress toward goal), manually reverse data array order in RTL
- Test tooltip positioning by hovering in Arabic view - may need custom tooltip component
- Consider if chart semantics require flipping (progress bars yes, time series no)

**Warning signs:**
- Chart tooltips appear on opposite side of cursor
- X-axis labels overlap or misalign in Arabic
- Bar charts show newest data on left in Arabic (if should be on right for RTL)

**Example from codebase:** `/src/components/charts/ProgressCharts.tsx` uses Recharts LineChart - weight trend timeline should likely stay LTR (time always flows left-to-right universally).

**Source:** [Recharts RTL Issues on GitHub](https://github.com/recharts/recharts/issues/682)

### Pitfall 7: Ambiguous Directional UI Elements
**What goes wrong:** Users confused about which direction to interpret UI elements like sliders, arrows, or progress indicators.

**Why it happens:** Research shows "amBiDiguity" phenomenon - bidirectional users interpret directional elements inconsistently without additional context.

**How to avoid:**
- Never use standalone directional icons without text labels
- Add translated text labels like "Next" / "التالي" next to arrows
- For sliders, consider vertical orientation (universal) instead of horizontal
- Add visual indicators of direction (chevrons, "from-to" labels)
- Test with native Arabic speakers, not just Arabic-speaking developers

**Warning signs:**
- User testing reveals confusion about navigation direction
- Users clicking wrong arrow buttons
- Support tickets about "backward" UI behavior

**Source:** [Localization Station: RTL Product Launch Guide](https://www.localizationstation.com/posts/how-to-launch-an-rtl-version-of-your-product-and-survive)

## Code Examples

Verified patterns from official sources:

### Locale-Aware Date Formatting (Client Component)
```typescript
// Source: https://next-intl.dev/docs/usage/dates-times
"use client";
import { useFormatter, useLocale } from "next-intl";

export function ActivityDate({ dateString }: { dateString: string }) {
  const format = useFormatter();
  const locale = useLocale();

  const date = new Date(dateString);

  return (
    <time dateTime={dateString}>
      {format.dateTime(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
        // Automatically uses correct locale and calendar
      })}
    </time>
  );
}
```

### Locale-Aware Number Formatting with Eastern/Western Numerals
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
"use client";
import { useLocale } from "next-intl";

export function StatCard({ value, label }: { value: number; label: string }) {
  const locale = useLocale();

  // For Egypt (Eastern Arabic numerals ٠-٩)
  const formattedValue = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US"
  ).format(value);

  // Alternative: Force Western numerals even in Arabic
  // const formattedValue = new Intl.NumberFormat(
  //   locale === "ar" ? "ar-u-nu-latn" : "en-US"
  // ).format(value);

  return (
    <div>
      <p className="text-5xl font-black">{formattedValue}</p>
      <p>{label}</p>
    </div>
  );
}
```

### RTL-Aware Progress Bar with Proper Fill Direction
```tsx
// Source: Research synthesis from multiple sources
"use client";
import { useLocale } from "next-intl";

export function ProgressBar({
  percentage,
  label
}: {
  percentage: number;
  label: string;
}) {
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="font-bold">{percentage}%</span>
      </div>
      <div
        className="h-6 border-4 border-black bg-neutral-100 overflow-hidden"
        dir={dir}
      >
        <div
          className="h-full bg-success-500 transition-all"
          style={{
            width: `${percentage}%`,
            // Critical for RTL: ensure fill anchors to start
            marginInlineStart: 0,
            marginInlineEnd: "auto"
          }}
        />
      </div>
    </div>
  );
}
```

### Logical Properties in Tailwind (Post-Migration)
```tsx
// Source: https://ui.shadcn.com/docs/rtl
// Before migration (physical properties)
<div className="ml-6 border-r-4 text-left">

// After `pnpm dlx shadcn@latest migrate rtl` (logical properties)
<div className="ms-6 border-e-4 text-start">

// Positioning
<div className="right-4 absolute"> → <div className="end-4 absolute">

// Padding/margin combinations
<div className="pl-2 pr-8"> → <div className="ps-2 pe-8">
```

### Directional Icon Handling
```tsx
// Source: https://ui.shadcn.com/docs/rtl
import { ChevronRight, ArrowLeft, Play, Phone } from "lucide-react";

export function NavigationButton({ label }: { label: string }) {
  return (
    <button>
      {label}
      {/* Icons that should flip in RTL */}
      <ChevronRight className="ms-2 rtl:rotate-180" />
    </button>
  );
}

export function MediaControls() {
  return (
    <button>
      {/* Media controls NEVER flip - universal direction */}
      <Play className="h-4 w-4" />
    </button>
  );
}
```

### Translation Key Validation Script
```json
// Source: https://lingual.dev/blog/validating-your-nextjs-internationalization/
// package.json
{
  "scripts": {
    "i18n:check": "i18n-check -l src/messages -s en -u src/ -f next-intl",
    "i18n:audit": "pnpm i18n:check && echo 'Translation audit complete'"
  },
  "devDependencies": {
    "i18n-check": "latest"
  }
}
```

### Browser Testing for RTL Layout
```bash
# Source: https://groups.google.com/a/chromium.org/g/chromium-dev/c/jfFdtQ4Lc_w
# Chrome with forced RTL UI direction
google-chrome --force-ui-direction=rtl http://localhost:3000

# Test locale switching via DevTools
# 1. Open DevTools → Console
# 2. Run: document.documentElement.setAttribute('dir', 'rtl')
# 3. Run: document.documentElement.setAttribute('lang', 'ar')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual RTL styles with `[dir="rtl"]` selectors | CSS logical properties (margin-inline-start, etc.) | CSS Logical Properties Level 1 (2017-2018 spec, wide support 2020+) | Automatic RTL without duplicated rules |
| Tailwind physical utilities only | Tailwind logical utilities (ms-*, start-*, etc.) | Tailwind v3.3+ (2023) | Native RTL support in utility-first CSS |
| Manual component transformation for RTL | shadcn/ui automated RTL migration CLI | January 2026 | One-command conversion of entire component library |
| Separate JSON files for numeral systems | Intl API with `nu` extension key | ECMAScript Internationalization API (stable 2015+) | Runtime locale switching without multiple configs |
| next-intl type checking via manual interfaces | Automatic .d.json.ts generation | next-intl v3+ (2023) | TypeScript catches missing keys at compile time |

**Deprecated/outdated:**
- **tailwindcss-flip plugin**: Replaced by native Tailwind logical properties in v3.3+
- **Manual `[dir="rtl"]` CSS selectors**: Use logical properties which work automatically
- **rtl-detect npm package**: next-intl provides `useLocale()` hook, no need for separate detection
- **Generic "ar" locale for numbers**: Too ambiguous - use country-specific codes (ar-EG, ar-SA) for predictable numeral systems
- **Separate RTL stylesheets**: Modern approach uses single stylesheet with logical properties

## Open Questions

1. **Eastern vs Western Arabic Numerals**
   - What we know: ar-EG uses Eastern (٠-٩), ar-SA often uses Western (0-9)
   - What's unclear: What does the Egyptian coach/target market prefer?
   - Recommendation: During Phase 10 execution, show coach both options and get explicit decision. Document in env variable `ARABIC_NUMERAL_SYSTEM=eastern|western` or force via locale code choice.

2. **Recharts RTL Behavior**
   - What we know: Recharts has known RTL issues with tooltips and axis labels
   - What's unclear: Should time-series charts flip in RTL, or stay LTR (time is universal)?
   - Recommendation: Time series (weight trend) should stay LTR with explicit `dir="ltr"` wrapper. Progress indicators (adherence bars) should respect RTL. Test both approaches with coach.

3. **shadcn components.json RTL Setting**
   - What we know: Current components.json doesn't have `rtl: true`
   - What's unclear: Will running `migrate rtl` update components.json, or is it manual?
   - Recommendation: Test migration CLI on a single component first, check components.json change, document in PLAN.md. If manual, add step to update components.json.

4. **Translation Key Audit Baseline**
   - What we know: Both en.json and ar.json are 602 lines
   - What's unclear: Line count match doesn't guarantee all keys exist - could have different keys or structural differences
   - Recommendation: Run i18n-check CLI to get definitive missing key report. Don't rely on line count.

5. **Admin Panel RTL Support**
   - What we know: Admin panel exists at `(admin)/admin/(panel)/*` with separate layout
   - What's unclear: Does coach need Arabic interface, or is English-only acceptable for admin?
   - Recommendation: Audit admin panel IF coach needs bilingual admin (likely yes for Egyptian market). Add to scope if required.

## Sources

### Primary (HIGH confidence)
- [next-intl Official Documentation](https://next-intl.dev/) - Date/time formatting, number formatting, locale detection hooks
- [shadcn/ui RTL Documentation](https://ui.shadcn.com/docs/rtl) - Official RTL migration guide and CLI commands (January 2026)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Eastern/Western Arabic numerals with `nu` extension
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) - Native logical properties support

### Secondary (MEDIUM confidence)
- [Flowbite RTL Guide](https://flowbite.com/docs/customize/rtl/) - Tailwind RTL patterns and ms-*/me-* utilities
- [tailwindcss-rtl npm package](https://www.npmjs.com/package/tailwindcss-rtl) - RTL plugin usage (project already has v0.9.0)
- [i18n-check by Lingual](https://lingual.dev/blog/validating-your-nextjs-internationalization/) - Translation validation tooling
- [Right to Left Styling 101](https://rtlstyling.com/posts/rtl-styling/) - Comprehensive RTL CSS patterns

### Tertiary (LOW confidence - community insights)
- [Localization Station: RTL Product Launch](https://www.localizationstation.com/posts/how-to-launch-an-rtl-version-of-your-product-and-survive) - Practical pitfalls and "amBiDiguity" research
- [Reffine: RTL Mistakes & Best Practices](https://www.reffine.com/en/blog/rtl-website-design-and-development-mistakes-best-practices) - Common pitfalls like "just flip it" fallacy
- [Recharts RTL Issues (GitHub #682)](https://github.com/recharts/recharts/issues/682) - Known chart library RTL limitations
- [Medium: RTL Layouts with Tailwind](https://medium.com/@dimuthupinsara/mastering-rtl-ltr-layouts-with-css-logical-properties-4bc0fccd2014) - Logical property patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation for next-intl, shadcn/ui RTL support is new (Jan 2026) but official
- Architecture: HIGH - Patterns derived from official docs and established CSS standards (logical properties)
- Pitfalls: MEDIUM-HIGH - Mix of codebase analysis (HIGH) and community experience reports (MEDIUM)
- Number formatting: HIGH - MDN documentation and ECMAScript spec are authoritative
- Recharts RTL: MEDIUM - Known issues documented in GitHub, but workarounds not officially documented

**Research date:** 2026-02-15
**Valid until:** ~30 days (March 17, 2026) - RTL patterns are stable, but shadcn/ui RTL support is very new (Jan 2026) and may see rapid iteration

**Key cavebase findings:**
- `globals.css` already has RTL font switching and letter-spacing fixes (lines 119-157)
- `layout.tsx` correctly sets `dir={locale === "ar" ? "rtl" : "ltr"}` attribute (line 30)
- Utility functions exist (`formatDate`, `formatNumber`) but inconsistently used - many components hardcode "en-US"
- No logical properties in UI components yet (e.g., `tabs.tsx` uses `border-r-4`)
- Both translation files are 602 lines but key parity not verified
- Progress bars in `ProgressCharts.tsx` and `DateProgress.tsx` use inline width styles without RTL handling
