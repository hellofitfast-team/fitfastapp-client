# Phase 13: Page-Level Renovation - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Every dashboard page, auth page, and empty state uses the new design system and feels like a modern mobile-native app. This covers: home screen, meal plan page, workout plan page, tickets/conversation, tracking, progress, settings, FAQ, all 6 empty states, auth pages (login/signup), and desktop responsive layout. No new capabilities — purely visual renovation of existing pages.

</domain>

<decisions>
## Implementation Decisions

### Home Screen Layout
- Motivational greeting with user's name — rotating motivational messages (not time-of-day), e.g., "Keep pushing, Ahmed"
- Horizontal carousel-style cards on mobile — auto-scroll every few seconds + manual swipe with dot indicators
- Desktop layout is at Claude's discretion (carousel may not be ideal for wide screens)
- Cards should use royal blue brand color accents — match the main brand color throughout
- Today's plan card density: Claude's discretion
- Coach message banner behavior: Claude's discretion
- Plan cycle countdown style: Claude's discretion
- Quick stats widget metrics: Claude's discretion

### Plan Pages (Meal + Workout)
- Day selector (1-14) style: Claude's discretion (horizontal scrollable pills or calendar strip)
- Meal cards use accordion collapse — only one card open at a time, tap header to toggle
- Collapsed meal card info density: Claude's discretion
- Workout exercises when expanded: detailed mini-cards with muscle group tags, sets/reps, and optional notes (not a simple list)

### Tickets & Conversation UI
- WhatsApp/iMessage-style rounded chat bubbles — client messages right/blue, coach messages left/gray
- Both date separators ("Today", "Yesterday", "Feb 15") AND per-message timestamps (small time under each bubble)
- Ticket list view: minimal — subject, status badge, last message preview, time ago
- Ticket status: colored pill badges — green for open, gray for closed, yellow for waiting

### Empty States & Auth Pages
- Flat vector illustrations — colorful, friendly, modern SaaS style
- Royal blue as dominant color in illustrations with neutral accents
- CTA buttons use friendly nudge tone — "Let's get started!", "Your coach is here to help", "Time to check in!" (conversational, not command-like)
- Auth page layout: Claude's discretion

### Claude's Discretion
- Today's plan card information density (minimal summary vs preview with details)
- Coach message banner behavior (persistent vs dismissible)
- Plan cycle countdown presentation (ring vs badge vs other)
- Quick stats widget metrics selection
- Day selector style for plan pages
- Collapsed meal card info shown
- Desktop layout adaptation (home screen carousel → appropriate desktop pattern)
- Auth page layout (centered card vs split layout)
- Loading skeleton designs throughout
- Exact spacing, typography, and error state handling

</decisions>

<specifics>
## Specific Ideas

- Home carousel cards should auto-scroll between sections with manual swipe override and dot position indicators
- Royal blue should be the dominant brand accent on home screen cards — not just a subtle touch
- Ticket conversation should feel like WhatsApp with rounded bubbles, not like a corporate inbox
- Empty state illustrations should be flat SaaS-style with royal blue dominant — think Stripe/Linear empty states but with more color
- CTA copy should feel personal and encouraging, like a coach talking to their client

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-page-level-renovation*
*Context gathered: 2026-02-22*
