# Feature Landscape: FitFast v1.1 Mobile UI Renovation

**Domain:** Mobile fitness coaching PWA -- UI/UX overhaul for native mobile feel
**Researched:** 2026-02-17
**Overall Confidence:** MEDIUM-HIGH (patterns well-established, implementation specifics verified)

---

## 1. Home Screen Patterns

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Greeting header with time-of-day context | Every major fitness app does this (Hevy, Fitbod, MFP). Users expect personalization on first glance. | Low | "Good morning, Ahmed" with current date. Time-aware: morning shows today's meals first, evening shows workout summary. |
| Widget-style scrollable cards | Fitbod, Apple Health, Google Fit all use card-based dashboards. Users scan, not read. | Medium | Horizontal-scrollable card row for quick stats (weight trend, streak, next check-in), then vertical scroll for plans. |
| Today's plan at-a-glance | Hevy shows "recommended workout" front and center. Fitbod shows next workout immediately. | Medium | Top card: "Today's Focus" -- either meal plan day or workout day, one tap to expand. |
| Quick-action FAB or prominent CTA | Users need one obvious thing to do. Reduces decision fatigue. | Low | "Log Check-in" button when check-in is due. Otherwise, contextual CTA based on plan status. |
| Streak/consistency indicator | Gamification drives 2.3x retention (multiple sources). Streaks are table stakes in 2025. | Low | Simple flame icon with streak count. Check-in streak, not daily login. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Coach message banner | Most fitness apps are self-serve. FitFast has a real coach -- surface that relationship. | Low | Pinned banner at top when coach has a new ticket response. "Your coach replied" with one-tap to tickets. |
| Bilingual dynamic greeting | Egyptian market differentiator. Arabic greeting feels personal. | Low | Greeting in user's selected language. Arabic: right-aligned, proper Arabic font rendering. |
| Plan countdown | Shows investment value -- "Day 8 of 14" creates commitment psychology. | Low | Progress ring showing current day in plan cycle. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Social feed / community section | FitFast is coach-to-client, not social. Adds complexity, no business value for single-coach model. | Keep tickets for all coach communication. |
| Calorie logging / food diary | FitFast generates meal plans -- clients follow them, not log independently. Logging creates friction. | Show today's prescribed meals with checkboxes for adherence (future). |
| Real-time activity tracking | PWA limitations make pedometer/GPS unreliable. Not the product's value prop. | Focus on plan adherence, not activity tracking. |

---

## 2. Meal Plan Display

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Day selector (horizontal scroll) | MyFitnessPal, Noom, and every meal planning app uses a horizontal day strip. Users need to jump between days. | Medium | Horizontal scrollable day pills (1-14) at top. Current day highlighted. Sticky on scroll. |
| Collapsed meal cards with macro summary | Screen real estate is precious on mobile. Users scan meals, expand what interests them. | Medium | Each meal (Breakfast, Lunch, Dinner, Snacks) as a collapsed card showing: meal name, total calories, one-line ingredient preview. Tap to expand full recipe. |
| Daily nutrition summary | Users need to see total daily macros at a glance without mental math. | Low | Sticky top bar or card: Total calories, Protein/Carbs/Fat bars with gram counts. Color-coded (P=blue, C=yellow, F=red -- standard convention). |
| Ingredient list with quantities | Clients need to know what to buy and how much. This is the core value. | Low | Expanded card shows ingredients with Egyptian-relevant measurements (grams, cups, pieces). |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Meal swap indicator | AI-generated plans include alternatives. Surface them -- reduces "I don't like this meal" complaints to coach. | Medium | Small "swap" icon on each meal card. Tap shows AI-provided alternative meal with same macros. |
| Grocery list view (derived) | Aggregates ingredients across days. Saves client time. Common request in meal planning apps. | High | Defer to v1.2. Just note it as a future feature. |
| Print/share meal plan | Clients screenshot plans anyway. Give them a cleaner option. | Medium | Defer. Low priority for MVP renovation. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Meal logging / calorie counting | FitFast prescribes plans, doesn't track intake. Different product category. | Show prescribed plan clearly. Future: simple checkboxes for "did you follow this meal?" |
| Recipe step-by-step with timers | Turns meal plan into a cooking app. Out of scope. Ingredients + quantities are sufficient. | Keep ingredient list clean. Coach can add prep notes in plan generation prompt. |

---

## 3. Workout Plan Display

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Day selector (matching meal plan) | Consistency across plan views. Users expect same navigation pattern. | Low | Same horizontal day pill strip as meal plan. Reuse component. |
| Exercise cards with sets/reps/weight | Hevy, Fitbod, Strong all show exercise name + prescribed sets as the core unit. This is non-negotiable. | Medium | Card per exercise: name, target muscle tag, sets x reps x weight in a clean grid. |
| Muscle group tags/icons | Visual scanning aid. Users want to know "what am I working today" at a glance. | Low | Color-coded pill tags: Chest, Back, Legs, Shoulders, Arms, Core. Icon optional. |
| Rest period indicators | Hevy auto-starts rest timers. Users expect to know prescribed rest between sets. | Low | Show rest time between exercises (e.g., "Rest: 60s"). No timer needed for plan display (this is a plan, not a live tracker). |
| Collapsible exercise detail | Same pattern as meals -- show summary, expand for detail. Keeps the day overview scannable. | Medium | Collapsed: exercise name + "4x12" summary. Expanded: full set breakdown, notes, alternatives. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Exercise alternative swaps | Same as meal swaps. AI provides alternatives. Surface them to reduce coach tickets. | Medium | "Swap" icon per exercise. Shows alternative with same muscle group targeting. |
| Superset/circuit grouping | Visual grouping of exercises that should be done together. Professional coaching touch. | Medium | If AI generates supersets, show them in a connected card group with a vertical line connector. |
| Daily workout summary card | "Today: Upper Body -- 8 exercises, ~45 min" gives users mental prep. | Low | Summary card at top of each day with workout type, exercise count, estimated duration. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Live workout tracking with timers | Turns plan display into a workout tracker app (Hevy/Strong territory). Major scope creep. Not the value prop -- FitFast generates plans, doesn't track execution. | Display plans cleanly. If live tracking is ever needed, it is a separate v2.0 feature. |
| Exercise video embeds | Requires video hosting, content creation, or licensing. Coach can link YouTube videos in admin panel (future). | Show exercise name clearly. Consider static illustration icons (future). |
| 1RM calculators / progression algorithms | Algorithm complexity. FitFast's AI handles progression through check-in feedback loop. | Let AI adjust weights in next plan cycle based on check-in data. |

---

## 4. Check-in UX

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Step-by-step wizard (not single long form) | Research shows 40% lower abandonment with stepped forms. Mobile keyboards obscure content on long forms. One question at a time is the standard. | Medium | 4-5 steps: (1) Weight, (2) Measurements, (3) Photos, (4) Notes/Feedback, (5) Review & Submit. Swipe between steps. |
| Progress indicator | Users need to know how far along they are. Reduces "how much more?" anxiety. | Low | Segmented progress bar at top. Filled segments for completed steps. Current step highlighted. |
| Photo upload with camera integration | Progress photos are core to coaching. Must feel native: tap to take photo or select from gallery. | Medium | Full-width photo capture area. Camera icon prominent. Show thumbnail previews of taken photos. Allow front/back/side pose prompts. |
| Smart defaults and pre-fill | Pre-fill last check-in's weight. Reduce typing. Fitbod and Hevy both pre-fill from last session. | Low | Pre-populate weight with last entry. Numeric keyboard for all number fields. |
| Review screen before submit | Users want to confirm data before it triggers AI plan generation (which costs money and time). | Low | Final step shows all entered data in a summary card. "Submit Check-in" button with clear indication that this triggers plan generation. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Pose guide overlay on camera | Helps clients take consistent progress photos. Professional coaching touch. | High | Defer to v1.2. For now, show text prompts: "Front view", "Side view", "Back view". |
| Motivational micro-copy per step | Emotional messages increase exercise adherence (NIH research). Small touch, big impact. | Low | Each step has a brief encouraging line: "Every measurement tells a story" or "Your coach will review this personally". |
| Haptic feedback on step completion | Makes form feel native, not webby. Small dopamine hit per completed step. | Low | Vibration API on step advance. Light haptic, not aggressive. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Daily check-ins | Coach defines check-in frequency (currently 14-day cycles). Daily check-ins create fatigue and increase AI costs. | Show "Next check-in: [date]" on home screen. Lock check-in form until due date. |
| Mood/sleep/stress tracking | Scope creep. Not part of current plan generation. Adds fields without actionable output. | Keep notes field open-ended. Client can mention mood there if relevant. |

---

## 5. Navigation Patterns

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Bottom nav bar (4 items) | Industry standard. 3-5 items max. Thumb zone ergonomics. Every major app uses this. | Medium | 4 items: Home, Meals, Workout, Check-in. Icons + labels. Active state with filled icon + accent color. |
| Floating pill shape with elevation | Modern design trend (2024-2026). Differentiates from system chrome. Feels premium. | Low | Rounded pill shape (border-radius: 9999px), slight elevation shadow, 12-16px margin from screen edges and bottom safe area. |
| Safe area handling (notch/home indicator) | iOS notch and home indicator bar overlap nav if not handled. Broken on iPhone = broken for 40%+ of Egyptian smartphone users. | Low | Use `env(safe-area-inset-bottom)` padding. Test on iPhone SE, iPhone 14/15 Pro, and common Android devices. |
| Active state animation | Static icons feel dead. Subtle scale + color transition on active tab. | Low | Scale to 1.1x + accent color fill on active. Spring animation (150ms). |
| More menu (bottom sheet) | Secondary destinations need a home without cluttering primary nav. | Medium | "More" icon (three dots or grid) opens bottom sheet with: Tracking, Progress, Tickets, FAQ. Slide-up animation with backdrop blur. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Badge on check-in tab | Visual reminder when check-in is due. Drives the core business action. | Low | Red dot badge on Check-in icon when a check-in is due or overdue. |
| Badge on home tab for coach messages | Surfaces coach communication without dedicated chat tab. | Low | Notification dot on Home when there's an unread ticket reply. |
| Hide nav during scroll (optional) | Gives more content space. Instagram/TikTok pattern. | Medium | Consider but not required. Content areas aren't long enough to justify. Keep nav always visible for now. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Hamburger menu | Hides navigation. Lower discoverability. Not mobile-first in 2025. | Bottom nav + bottom sheet for overflow. |
| Tab bar with 5+ items | Cramped on small screens. Labels become unreadable. | 4 primary items + "More" bottom sheet for secondary. |
| Swipe-between-tabs navigation | Conflicts with swipe-back gesture on iOS. Causes accidental navigation. | Tap to navigate between tabs. Reserve swipe for check-in wizard steps only. |

---

## 6. Empty States

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Illustrated empty states (not just text) | "No data" text feels broken. An illustration communicates "this is intentional, here's what to do." | Medium | Simple illustration or icon + explanatory text + CTA button per empty state. |
| Clear CTA on every empty state | Users must know what action to take. Empty state without CTA = dead end. | Low | Every empty state has one primary action button. |
| Contextual messaging | Generic "No items" is unhelpful. Tell users WHY it's empty and WHAT to do. | Low | Specific copy per screen (see below). |

### Specific Empty States for FitFast

| Screen | Empty State Message | CTA |
|--------|-------------------|-----|
| Home (no plans yet) | "Your coach is preparing your first plan. Hang tight!" | "Message Coach" (opens tickets) |
| Home (pending approval) | "Your account is being reviewed by your coach. You'll be notified when approved." | None (waiting state) |
| Meal Plan (no plan) | "No meal plan yet. Complete your check-in so your coach can generate one." | "Go to Check-in" |
| Workout Plan (no plan) | "No workout plan yet. Your coach will create one after your check-in." | "Go to Check-in" |
| Check-in (not due yet) | "Your next check-in is on [date]. Keep following your plan!" | None (show current plan link) |
| Tickets (no tickets) | "No messages yet. Have a question for your coach?" | "Start a Conversation" |
| Tracking (no data) | "No tracking data yet. Your progress will appear here after your first check-in." | "Go to Check-in" |
| Progress (no data) | "Complete at least 2 check-ins to see your progress charts." | "Go to Check-in" |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Motivational empty states | Turn waiting into encouragement. Egyptian fitness culture responds to motivational language. | Low | Add motivational subtext: "Great things take time" or "Your transformation starts here". |
| Skeleton → content transition | When data loads, animate from skeleton to content. Feels fast and polished. | Medium | Use skeleton shimmer matching card layouts. Animate content in with fade + slight upward slide. |

---

## 7. Micro-interactions and Native Feel

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Skeleton loading screens | Gray placeholder shapes matching content layout. Every modern app does this. Eliminates layout shift. | Medium | Create skeleton variants for: home cards, meal cards, workout cards, ticket list. Match exact layout dimensions. |
| Pull-to-refresh | Universal mobile pattern. Users expect it on any list/feed. Missing = "is this app broken?" | Medium | Implement on: home page, meal plan, workout plan, tickets, tracking. Use native-feeling spring animation. Show refresh indicator. |
| Button press feedback | Buttons that don't respond to touch feel broken. Scale down slightly on press. | Low | `active:scale-95` on all interactive elements. 100ms transition. Combine with haptic on important actions. |
| Page transitions | Abrupt page changes feel like a website, not an app. Smooth transitions = native feel. | Medium | Fade + slide transitions between pages. Use `motion/react` (formerly Framer Motion) for route transitions. Keep under 200ms. |
| Toast notifications | Feedback for actions: "Check-in submitted", "Settings saved". Users need confirmation. | Low | Bottom-positioned toast with icon + message. Auto-dismiss after 3s. Use existing shadcn/ui toast. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| Haptic feedback on key actions | Makes PWA feel native. Subtle vibration on: tab switch, check-in submit, step advance. | Low | Use `navigator.vibrate()` with short patterns. 10ms for taps, 50ms for confirmations. Feature-detect and degrade gracefully. |
| Spring-based animations | Physics-based motion feels more natural than linear easing. Modern apps use springs exclusively. | Low | Use `motion/react` spring presets. Default: `stiffness: 300, damping: 30`. Avoid `ease-in-out` for interactive elements. |
| Gesture-based interactions | Swipe to dismiss bottom sheet, swipe between check-in steps. Feels native. | Medium | Bottom sheet: drag down to dismiss. Check-in: swipe left/right between steps. Use touch event handlers with velocity detection. |
| Optimistic UI updates | Show changes immediately, sync in background. Eliminates perceived latency. | Medium | Apply to: settings changes, ticket messages (show immediately, confirm with server). |
| Scroll-linked animations | Cards fade in as they scroll into view. Subtle parallax on hero elements. | Low | Use Intersection Observer for fade-in-up on cards. Keep subtle -- 20px translate, 200ms duration. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Heavy animation on every element | Performance killer on mid-range Android phones (common in Egypt). Battery drain. | Animate only interactive elements and transitions. Respect `prefers-reduced-motion`. |
| Custom scroll physics | Overriding native scroll feels wrong. Users notice immediately. | Use native scroll everywhere. Only add pull-to-refresh and scroll-snap for specific carousels. |
| Loading spinners | Spinners feel slow. Skeleton screens feel fast (same load time, different perception). | Replace all spinners with skeleton screens. |

---

## 8. RTL Considerations for Arabic

### Table Stakes

| Pattern | Why Expected | Complexity | FitFast Recommendation |
|---------|-------------|------------|----------------------|
| Full layout mirroring | Arabic reads right-to-left. Navigation, cards, lists must all flip. | Medium | Already using Tailwind RTL plugin. Verify: nav items flip, card layouts mirror, swipe directions reverse. |
| Proper Arabic typography | Default system Arabic fonts are adequate but not beautiful. Font choice matters for readability. | Low | Use `IBM Plex Arabic` or `Noto Sans Arabic` for body. System font stack as fallback. Ensure proper line-height (1.8 for Arabic vs 1.5 for English). |
| Mirrored icons (directional) | Arrows, chevrons, progress bars must flip in RTL. Non-directional icons (home, gear) stay the same. | Low | Already handled in v1.0 RTL audit. Verify: back arrows, pagination chevrons, progress bar fill direction all flip. |
| Number display | Weight, measurements, macros use Western Arabic numerals (0-9) in Egypt, not Eastern Arabic. Right-align number groups. | Low | Keep Western numerals. Ensure numeric inputs work correctly in RTL context. |
| Text alignment in cards | Mixed content (Arabic labels + numbers) needs careful alignment. | Low | Labels right-aligned in RTL. Numbers can stay left-aligned within their container for readability. |

### Differentiators

| Pattern | Value Proposition | Complexity | FitFast Recommendation |
|---------|------------------|------------|----------------------|
| RTL swipe direction reversal | In RTL, "next" is leftward and "back" is rightward. Check-in wizard swipe must respect this. | Medium | Detect locale direction. Reverse swipe gesture mapping for check-in steps in Arabic mode. |
| Arabic-optimized spacing | Arabic text is wider and taller than English. Cards may need slightly more padding in RTL. | Low | Test all cards in Arabic. Add 4-8px extra vertical padding for Arabic text containers if needed. |
| Bilingual data display | Some data (exercise names, ingredient names) may be in Arabic while units stay English. Handle gracefully. | Low | AI generates plans in user's language. Ensure mixed-direction text (e.g., "200g" next to Arabic text) uses proper `dir` attributes. |

### Critical RTL Testing Points

| Component | What to Test |
|-----------|-------------|
| Bottom nav | Icons + labels flip order (rightmost = first item) |
| Day selector pills | Scroll direction starts from right, Day 1 on the right |
| Check-in wizard | Swipe directions inverted, progress bar fills right-to-left |
| Meal/workout cards | Expand/collapse chevron direction, content alignment |
| Bottom sheet | Slide-up animation unchanged (vertical is direction-neutral) |
| Charts/graphs | X-axis direction for progress charts (time flows left-to-right universally) |
| Toast notifications | Appear from correct side, text right-aligned |

---

## 9. Feature Dependencies

```
Bottom Nav + More Menu
  --> Home Screen Redesign
  --> Meal Plan Redesign
  --> Workout Plan Redesign
  --> Check-in Wizard

Skeleton Loading System
  --> All page redesigns (home, meals, workouts, tracking, progress)

Motion/Animation System (motion/react setup)
  --> Page transitions
  --> Bottom sheet animations
  --> Check-in swipe steps
  --> Card expand/collapse
  --> Pull-to-refresh

Empty States
  --> Each page redesign (implement alongside)

RTL Verification
  --> Runs AFTER all component redesigns complete
  --> Must test every new component in Arabic mode
```

---

## 10. MVP Recommendation for v1.1

### Must Have (Core Renovation)

1. **Bottom navigation bar** -- Floating pill, 4 items + more menu bottom sheet. This is the foundation that makes everything else feel like an app.
2. **Home screen widget cards** -- Greeting, today's plan, quick stats, coach message banner. First screen users see.
3. **Collapsed meal/workout cards with day selector** -- Core content display. Horizontal day pills + expandable cards.
4. **Check-in wizard** -- Step-by-step with progress bar and swipe navigation. Core business action.
5. **Skeleton loading** -- Replace all loading spinners with skeleton screens. Instant perceived performance boost.
6. **Empty states** -- Every screen needs a proper empty state with contextual messaging.
7. **Pull-to-refresh** -- On all data screens. Universal mobile expectation.
8. **Button/tap feedback** -- `active:scale-95` + haptic on key actions. Minimum viable "native feel."

### Should Have (Polish)

9. **Page transitions** -- Fade + slide between routes using `motion/react`.
10. **Spring animations** -- On card expand/collapse, bottom sheet, tab switches.
11. **Ticket chat bubbles** -- Restyle ticket thread as chat conversation.
12. **Onboarding wizard** -- One question per screen with animations.
13. **RTL swipe direction handling** -- Proper Arabic swipe behavior in check-in wizard.

### Defer to v1.2

14. **Meal swap UI** -- Showing AI alternatives requires data model verification.
15. **Grocery list view** -- Derived feature, needs new data aggregation.
16. **Pose guide overlay** -- Camera overlay complexity.
17. **Exercise illustration icons** -- Requires asset creation or licensing.
18. **Live workout tracking** -- Entirely different product feature.

---

## Sources

- [Fitness App UX Best Practices -- Stormotion](https://stormotion.io/blog/fitness-app-ux/)
- [UX/UI Design Practices for Fitness Apps 2025 -- Dataconomy](https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/)
- [Fitness App Development Guide 2026 -- MobiDev](https://mobidev.biz/blog/fitness-application-development-guide-best-practices-and-case-studies)
- [Hevy App Features](https://www.hevyapp.com/features/)
- [Hevy Exercise Programming](https://www.hevyapp.com/features/exercise-programming-options/)
- [Bottom Navigation Bar Guide 2025 -- AppMySite](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Bottom Tab Bar Best Practices -- UXD World](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)
- [Empty States UX -- UXPin](https://www.uxpin.com/studio/blog/ux-best-practices-designing-the-overlooked-empty-states/)
- [Micro-interactions 2025 -- BricxLabs](https://bricxlabs.com/blogs/micro-interactions-2025-examples)
- [Haptics Guide 2025 -- Saropa](https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774)
- [Motion (Framer Motion) React Docs](https://motion.dev/docs/react)
- [Arabic RTL App Design -- Kristi.digital](https://kristi.digital/shots/mobile-app-design-for-right-to-left-languages-arabic-language)
- [Arabic UI/UX Considerations -- UserQ](https://userq.com/5-essential-considerations-for-ui-ux-in-arabic-interfaces/)
- [Arabic App Design -- Omran Khleifat/Medium](https://medium.com/@omrankhleifat/arabic-app-aesthetics-navigating-the-sands-of-right-to-left-design-0b5a7c29fc31)
- [Stepper UI Examples -- Eleken](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [Fitness App Design Best Practices -- MadAppGang](https://madappgang.com/blog/the-best-fitness-app-design-examples-and-typical-mistakes/)
- [Motion Design Trends 2026 -- TechQware](https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect)
