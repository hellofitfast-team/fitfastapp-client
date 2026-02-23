# FitFast Design System: Clean Premium Light Theme

## Brand Identity

FitFast's current identity is built on a "Clean Premium Light Theme" (derived from 'Sovereign Performance'). The aesthetics reflect clinical precision, reliability, and an absolute premium standard in AI fitness coaching.

## 🎨 1. Core Color Palette

The color system relies on stark contrasts and clean whitespace to let the Royal Blue shine.

### Primary Colors

- Royal Blue `#0F52BA`: The core brand color. Used for prominent active states, highlighting important features, badges, SVGs, and vector accents. Conveys dominance, trust, and peak performance.
- Volt Yellow `#DFFF00`: The accent color. Used sparingly for critical explosive call-to-actions, checkmarks inside highlighted pricing blocks, and energy indicators.

### Neutral Palette (Light Mode Foundation)

- Background `#FFFFFF`: Pure white for maximum clarity and spaciousness.
- Surface Variant `#F8FAFC - Slate 50`: Used to gently separate large sections (e.g. Testimonials or Philosophy) from the pure white background.
- Borders `#E2E8F0 - Slate 200`: Soft line delineations, replacing harsh dark dividers.
- Text Primary (#0F172A - Slate 900): Deep, crisp text for primary headings and body paragraphs.
Text Muted (#64748B - Slate 500): Used for supporting subtitles, descriptions, and metadata.

## 🔤 2. Typography System

### Font Families

Headings (Inter/Sans Variable): Wide-tracked, structured, and confident. Used in the Hero (h1), Section Titles (h2), and Card Titles (h3).
Data & Code (JetBrains Mono / Monospace): Used for technical overlays, Phase indicators, System Status tags, and Telemetry typewriter effects.
Drama / Manifesto (Bebas Neue / Serif Italic): Utilized only in highly emotional moments like the Philosophy section ("SOVEREIGN PERFORMANCE") for maximum typographic impact.

## 📐 3. UI Paradigms & Component Patterns

### Elevations & Shadows

We shifted away from heavy neon glows. Shadows are now soft and diffused to give a "floating" paper aesthetic:

shadow-lg / shadow-xl: Applied to white cards against white backgrounds.
shadow-[var(--color-primary)]/5: A faint, extremely subtle Royal Blue tint added to card shadows to align with the brand.

### The "SaaS Pro" Bento Pattern

Data and value propositions are housed in unified grids or "Metric Ribbons".

Instead of isolated clunky cards, metrics use divide-x logic within a single pristine white pill container.
Hover Effects (hover:-translate-y-1): Interactions should feel magnetic, lifting smoothy without harsh snaps.

### The Highlight Block

Used to anchor the viewer's eye:

Primary Tier in Pricing features a solid bg-slate-900 container wrapped in a faint Royal Blue outer glow bg-[var(--color-primary)] opacity-10 blur-2xl.
High contrast, inverted theme (white text on dark slate) sets the premium option apart.

## 🖼️ 4. Graphic Asssets & Logos

All vector assets inherit the core brand palette (Royal Blue container, Volt Yellow lightning bolt).

Paths in Repository:

SVG Logo (<svg>):
/apps/marketing/public/logo.svg
SVG Favicon (<svg>):
/apps/marketing/public/favicon.svg
Rasterized Image (.png):
/apps/marketing/public/logo.png
AI Generated Preset Concept: /brain/<conversation-id>/fitfast_logo_preset_e_*.png
Usage Rules:

The logo mark features a subtle linear gradient from `#2F7BEE` to `#0F52BA` with an inner `#DFFF00` lightning bolt mask.

In glassmorphic headers (Navbar), the text wordmark follows an italicized uppercase pattern: Fit (Dark Slate) + Fast (Royal Blue).

In dark sections (Footer), the wordmark inverts Fit to White to preserve contrast.
