# Phase 1: Theme Rebrand - Core Color Swap - Research

**Researched:** 2026-02-12
**Domain:** Tailwind v4 theming, CSS custom properties, WCAG accessibility, PWA manifest configuration
**Confidence:** HIGH

## Summary

The FitFast app currently uses a brutalist design with orange (#FF3B00) and green (#00FF94) as accent colors against a cream (#FFFEF5) background. This phase requires swapping to Royal Blue (#4169E1) as the primary brand color while maintaining WCAG AA accessibility standards.

The codebase uses Tailwind v4's `@theme inline` directive in globals.css for custom properties, but has **36+ components with hardcoded hex values** (`bg-[#FF3B00]`, `text-[#00FF94]`, etc.) that must be systematically replaced. The app also has PWA configuration (manifest.json, meta tags) that needs theme color updates.

**Primary recommendation:** Replace hardcoded hex values with CSS custom property references, update `@theme inline` variables in globals.css, verify WCAG contrast ratios, and sync PWA theme_color across manifest.json and meta tags.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.1.18 | Styling framework | v4 uses `@theme inline` directive for CSS variables, eliminating tailwind.config.js |
| Next.js | 16.1.6 | App framework | App Router with viewport API for theme-color meta tags |
| shadcn/ui | Latest | Component library | Relies on CSS custom properties (--color-primary, --color-ring) for theming |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WebAIM Contrast Checker | Online tool | WCAG compliance validation | Verify Royal Blue passes 4.5:1 (text) and 3:1 (UI) ratios |
| oklch.com | Online tool | Color space conversion | Convert hex to OKLCH for Tailwind v4 (optional, HSL works) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HSL color values | OKLCH color values | Tailwind v4 supports both; OKLCH is newer but HSL has wider recognition |
| CSS custom properties | Tailwind color palette | Custom properties allow runtime theming; palette requires rebuild |

**Installation:**
No new dependencies required. All changes are configuration-based.

## Architecture Patterns

### Recommended Color Variable Structure
```
src/app/
├── globals.css          # @theme inline with --color-* variables
├── layout.tsx           # viewport.themeColor export
public/
└── manifest.json        # theme_color property
```

### Pattern 1: CSS Custom Properties with @theme inline
**What:** Tailwind v4's native theming system using `@theme inline` directive
**When to use:** All theme customizations, replacing the old tailwind.config.js approach
**Example:**
```css
/* Source: https://tailwindcss.com/docs/theme */
@theme inline {
  /* Primary color variables */
  --color-primary: #4169E1;           /* Royal Blue hex */
  --color-primary-foreground: #FFFEF5; /* Cream text on blue */
  --color-ring: #4169E1;              /* Focus ring color */

  /* HSL alternative (more flexible for opacity) */
  --color-primary-hsl: 225deg 73% 57%;
}
```

### Pattern 2: Component Variants with Semantic Names
**What:** Map hardcoded hex values to semantic color names in component variants
**When to use:** Button, input, and UI component styling
**Example:**
```typescript
// Source: Current codebase pattern from button.tsx
const buttonVariants = cva(
  "focus-visible:ring-4 focus-visible:ring-primary", // Use custom property reference
  {
    variants: {
      variant: {
        default: "bg-black text-cream hover:bg-primary",
        destructive: "bg-error-500 text-white hover:bg-black",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success-500 text-black hover:bg-primary",
      },
    },
  }
);
```

### Pattern 3: PWA Theme Color Sync
**What:** Keep manifest.json theme_color and viewport themeColor in sync
**When to use:** Any theme rebrand affecting primary brand color
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors
// In app/layout.tsx
export const viewport: Viewport = {
  themeColor: "#4169E1", // Royal Blue
};

// In public/manifest.json
{
  "theme_color": "#4169E1",
  "background_color": "#FFFEF5"
}
```

### Anti-Patterns to Avoid
- **Hardcoded hex in Tailwind classes:** `bg-[#FF3B00]` instead of `bg-primary` or CSS variable reference. Tailwind v4 scans source as plain text; dynamic string concatenation prevents detection.
- **Inconsistent color formats:** Mixing hex, HSL, and OKLCH for same logical color. Pick one format per variable.
- **Skipping dark mode block:** Even if app doesn't use dark mode, the `@media (prefers-color-scheme: dark)` block prevents unintended system-level overrides.
- **Meta tag vs manifest mismatch:** If theme-color meta tag differs from manifest theme_color, meta tag wins on Chromium browsers, causing inconsistency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color contrast validation | Manual WCAG calculations | WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/) | Precise contrast ratio calculations with AA/AAA pass/fail indicators |
| Finding hardcoded colors | Manual file inspection | `grep -rE '#[0-9A-Fa-f]{6}' src/` or ripgrep | Regex pattern matches all hex colors; ripgrep respects .gitignore |
| Color space conversion | Manual HSL/OKLCH math | oklch.com or color-hex.com converters | Accurate conversions between hex, HSL, RGB, OKLCH |
| PWA icon generation | Manual icon resizing | pwa-asset-generator (npm package) | Generates 192x192, 512x512, maskable icons, updates manifest automatically |

**Key insight:** Theme rebranding has hidden complexity in accessibility validation and cross-file consistency. Use automated tools for verification rather than manual checks.

## Common Pitfalls

### Pitfall 1: Incomplete Hardcoded Color Replacement
**What goes wrong:** Grep finds hex values in components, but developer misses inline styles, SVGs, or dynamic class construction
**Why it happens:** Tailwind scans source as plain text; string interpolation like `bg-${color}` isn't detected at build time
**How to avoid:**
1. Use multiple grep patterns: `#[0-9A-Fa-f]{6}`, `#FF3B00`, `#00FF94`, `orange`, `green`
2. Search for `bg-[#`, `text-[#`, `border-[#` specifically
3. Check globals.css scrollbar/animation styles (often forgotten)
**Warning signs:** Visual QA shows old colors in hover states, loading spinners, or focus rings

### Pitfall 2: WCAG Contrast Failure After Color Swap
**What goes wrong:** Royal Blue on cream background passes for large text (3:1) but fails for normal text (4.5:1)
**Why it happens:** #4169E1 has ~4.85:1 contrast against white, but cream (#FFFEF5) has slightly lower contrast
**How to avoid:**
1. Test Royal Blue (#4169E1) vs cream (#FFFEF5) in WebAIM Contrast Checker BEFORE implementing
2. If it fails, darken blue to ~#2952B3 or use black text on blue backgrounds
3. Test UI components (3:1 minimum) separately from text (4.5:1 minimum)
**Warning signs:** WebAIM flags "FAIL" for normal text; users with low vision report readability issues

### Pitfall 3: PWA Manifest/Meta Tag Desync
**What goes wrong:** Developer updates manifest.json theme_color but forgets viewport.themeColor in layout.tsx, causing Android vs iOS inconsistency
**Why it happens:** Next.js 13+ uses viewport export in layout.tsx for meta tags; manifest.json is separate config
**How to avoid:**
1. Update BOTH files in same commit
2. Add verification step: check installed PWA status bar color on Android (uses meta tag) and iOS (uses manifest)
3. Grep for `theme` across entire codebase to find all references
**Warning signs:** Status bar color differs between browsers; PWA install prompt shows old color

### Pitfall 4: Focus Ring Invisibility
**What goes wrong:** After changing `--color-ring` to Royal Blue, focus rings blend with blue buttons/links, breaking keyboard navigation visibility
**Why it happens:** Ring color needs contrast with BOTH the focused element AND the background
**How to avoid:**
1. Test focus states on all button variants (default, destructive, link, success)
2. Consider ring offset (`ring-offset-2`) for blue-on-blue scenarios
3. Alternative: Use black ring for consistency with brutalist theme
**Warning signs:** Tab navigation shows no visual indicator on primary buttons

### Pitfall 5: Brutalist Shadow Hardcoding
**What goes wrong:** Brutalist theme uses `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` with hardcoded black; changing to Royal Blue shadows breaks visual hierarchy
**Why it happens:** Box shadows reference old color scheme in pixel values, not CSS variables
**How to avoid:**
1. Grep for `shadow-\[` and `box-shadow:` to find custom shadows
2. Decide: keep shadows black (brutalist consistency) or make them Royal Blue (brand cohesion)
3. Extract shadow as CSS custom property if it needs theming
**Warning signs:** Cards and modals have visual inconsistency between borders and shadows

## Code Examples

Verified patterns from official sources:

### Updating globals.css @theme inline
```css
/* Source: https://tailwindcss.com/docs/theme */
@theme inline {
  /* OLD: Orange/Green palette */
  --color-orange: #FF3B00;
  --color-green: #00FF94;
  --color-ring: #FF3B00;

  /* NEW: Royal Blue palette */
  --color-royal-blue: #4169E1;           /* Define new variable */
  --color-primary: #4169E1;               /* Map to semantic name */
  --color-primary-foreground: #FFFEF5;
  --color-ring: #4169E1;                  /* Update focus ring */

  /* Semantic colors still reference old names */
  --color-success-500: #00FF94;  /* Keep green for success states */
  --color-error-500: #FF3B00;    /* Keep orange for errors */
}
```

### Replacing Hardcoded Hex in Components
```typescript
// Source: Current codebase button.tsx (lines 9-24)
// BEFORE:
const buttonVariants = cva(
  "focus-visible:ring-4 focus-visible:ring-[#FF3B00]",
  {
    variants: {
      variant: {
        default: "bg-black text-[#FFFEF5] hover:bg-[#FF3B00]",
        link: "text-[#FF3B00] underline-offset-4 hover:underline",
      },
    },
  }
);

// AFTER:
const buttonVariants = cva(
  "focus-visible:ring-4 focus-visible:ring-primary",
  {
    variants: {
      variant: {
        default: "bg-black text-cream hover:bg-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
  }
);
```

### WCAG Contrast Validation Script
```bash
# Source: https://webaim.org/resources/contrastchecker/
# Manual validation steps (no automated CLI tool available)
# 1. Visit WebAIM Contrast Checker
# 2. Enter foreground: 4169E1 (Royal Blue)
# 3. Enter background: FFFEF5 (Cream)
# 4. Verify:
#    - Normal text: ≥4.5:1 (WCAG AA)
#    - Large text: ≥3:1 (WCAG AA)
#    - UI components: ≥3:1 (WCAG 2.1)
```

### Finding All Hardcoded Colors
```bash
# Source: https://gist.github.com/wilfm/6f9b78a0db3553141757
# Grep for orange hex
grep -rn '#FF3B00' src/

# Grep for green hex
grep -rn '#00FF94' src/

# Grep for any hardcoded hex in Tailwind classes
grep -rn 'bg-\[#' src/
grep -rn 'text-\[#' src/
grep -rn 'border-\[#' src/
grep -rn 'hover:bg-\[#' src/

# Comprehensive hex pattern (all 6-char hex codes)
grep -rE '#[0-9A-Fa-f]{6}' src/
```

### PWA Theme Color Update
```json
// Source: https://developer.mozilla.org/en-US/docs/Web/Manifest/theme_color
// public/manifest.json
{
  "name": "FitFast - AI Fitness Coaching",
  "short_name": "FitFast",
  "theme_color": "#4169E1",        // Royal Blue
  "background_color": "#FFFEF5",   // Cream
  "display": "standalone"
}
```

```typescript
// Source: https://developer.chrome.com/blog/using-manifest-to-set-sitewide-theme-color
// src/app/layout.tsx
export const viewport: Viewport = {
  themeColor: "#4169E1", // Must match manifest.json
  width: "device-width",
  initialScale: 1,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js | @theme inline in CSS | Tailwind v4.0 (Dec 2024) | Simpler config, CSS-native theming |
| HSL color space | OKLCH color space | Tailwind v4.0+ | Better perceptual uniformity, but HSL still supported |
| Hardcoded theme-color meta tag | Next.js viewport export | Next.js 14+ | Centralized metadata management |
| Space-separated HSL | hsl() function | Tailwind v4.0 | Explicit color functions required |

**Deprecated/outdated:**
- **tailwind.config.js theme.extend.colors:** Tailwind v4 uses `@theme inline` directive instead
- **@import "tailwindcss/base":** Tailwind v4 uses single `@import "tailwindcss"` statement
- **prefers-color-scheme without override:** Modern apps explicitly set color-scheme to prevent system dark mode conflicts

## Open Questions

1. **Should semantic color names (success, error) keep old colors?**
   - What we know: Orange is currently used for both primary brand AND error states
   - What's unclear: Whether error states should stay orange (semantic clarity) or switch to Royal Blue derivatives
   - Recommendation: Keep orange for errors (#FF3B00 → `--color-error-500`), green for success (#00FF94 → `--color-success-500`). Only primary/accent use Royal Blue.

2. **OKLCH vs HSL for Royal Blue?**
   - What we know: Tailwind v4 prefers OKLCH for perceptual uniformity; #4169E1 = `hsl(225deg 73% 57%)`
   - What's unclear: Whether OKLCH provides measurable UX benefit for single primary color
   - Recommendation: Use HSL for familiarity and easier manual adjustments. Migrate to OKLCH in future multi-theme phase.

3. **Icon asset regeneration needed?**
   - What we know: Current icons are 192x192 and 512x512 PNGs with black theme
   - What's unclear: Whether icons contain orange/green that needs rebranding
   - Recommendation: Verify icons visually. If they're monochrome black/cream, no regeneration needed. If they contain orange/green, regenerate with Royal Blue accent.

4. **Focus ring color conflict on blue backgrounds?**
   - What we know: Brutalist theme uses 4px solid ring (`--color-ring`)
   - What's unclear: Whether Royal Blue ring on Royal Blue button meets 3:1 contrast
   - Recommendation: Test visually. If contrast fails, use `ring-black` for primary button variant or add `ring-offset-2` with cream offset.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Theme Documentation](https://tailwindcss.com/docs/theme) - @theme inline directive, color variables
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - Migration guide from config.js to CSS
- [WCAG 2.1 Contrast Minimum (1.4.3)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - 4.5:1 text, 3:1 UI requirements
- [MDN: Customize PWA Colors](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors) - theme_color and manifest best practices
- [shadcn/ui Theming Documentation](https://ui.shadcn.com/docs/theming) - CSS variable system for components

### Secondary (MEDIUM confidence)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) - Royal Blue #4169E1 has 4.85:1 contrast against white (verified tool)
- [Color-Hex.com Royal Blue](https://www.color-hex.com/color/4169e1) - HSL values: 225°, 72.73%, 56.86%
- [Chrome for Developers: Manifest Theme Color](https://developer.chrome.com/blog/using-manifest-to-set-sitewide-theme-color) - Meta tag overrides manifest on desktop Chromium
- [Evil Martians: How to Favicon in 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) - Minimal icon requirements (192x192, 512x512, SVG favicon)

### Tertiary (LOW confidence)
- [Medium: Tailwind v4 Multi-Theme](https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510) - General theming patterns (not specific to rebrand)
- [DaisyUI Common Mistakes](https://daisyui.com/blog/most-common-mistake-when-using-tailwind-css/) - Hardcoded color pitfall examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions verified from package.json, Tailwind v4 docs are authoritative
- Architecture: HIGH - Current codebase uses @theme inline pattern, verified in globals.css
- Pitfalls: MEDIUM-HIGH - Hardcoded colors verified via grep, WCAG math confirmed via WebAIM, PWA desync is documented pattern
- Color conversion: MEDIUM - HSL values cross-verified across multiple color tools, OKLCH not specifically calculated
- Icon regeneration: LOW - Current icons not visually inspected, assumption based on manifest structure

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable domain, minimal API changes expected)
