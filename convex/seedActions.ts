"use node";

/**
 * ============================================================================
 * WARNING: SEED FUNCTIONS — NOT FOR PRODUCTION USE
 * ============================================================================
 * These functions create/delete test users and seed demo data.
 * They are exported as `internalAction` (not publicly callable) but still
 * executable via `npx convex run`. A production guard below prevents
 * accidental execution on production deployments.
 * ============================================================================
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

/**
 * Guard against accidental execution on production deployments.
 * Set SEED_ENABLED=true on the Convex dashboard to override.
 */
function assertNotProduction() {
  const convexUrl = process.env.CONVEX_CLOUD_URL ?? "";
  const isProduction = convexUrl.includes(".convex.cloud") && !convexUrl.includes("dev");
  if (isProduction && process.env.SEED_ENABLED !== "true") {
    throw new Error(
      "Seed functions are disabled on production deployments. " +
        "Set the SEED_ENABLED=true environment variable on the Convex dashboard to override.",
    );
  }
}

/**
 * Hash password using Lucia's Scrypt — same algorithm used by Convex Auth.
 * Format: "hex_salt:hex_hash" with params N=16384, r=16, p=1, dkLen=64.
 */
async function hashPassword(password: string): Promise<string> {
  return await new Scrypt().hash(password);
}

/**
 * Seed test users into Convex Auth.
 * Creates user + authAccount + profile for each test user.
 *
 * Run: npx convex run seedActions:seedTestUsers
 *
 * Coach:  testadmin@admin.com / (set SEED_USER_PASSWORD env var)
 * Client: ziad.adel@scaleflow.digital / (set SEED_USER_PASSWORD env var)
 */
/**
 * Delete all non-coach client users and create a fresh one.
 * Run: npx convex run seedActions:resetClientUser
 *
 * New client: client@fitfast.app / (set SEED_USER_PASSWORD env var)
 */
export const resetClientUser = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword) throw new Error("SEED_USER_PASSWORD env var is required");

    const results: string[] = [];

    // Delete existing client users
    const clientEmails = [
      "ziad.adel@scaleflow.digital",
      "client@fitfast.app",
      "test_client@client.com",
    ];
    for (const email of clientEmails) {
      try {
        const r = await ctx.runMutation(internal.seed.deleteUserByEmail, {
          email,
        });
        results.push(r);
      } catch (error) {
        console.error("[Seed:seedTestUsers] Failed to delete seed user", {
          email,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push(`ERROR deleting seed user: ${error}`);
      }
    }

    // Create fresh client
    const hashedPassword = await hashPassword(seedPassword);
    try {
      const r = await ctx.runMutation(internal.seed.insertAuthUser, {
        email: "client@fitfast.app",
        hashedPassword,
        fullName: "Ziad Adel",
        isCoach: false,
      });
      results.push(r);
    } catch (error) {
      console.error("[Seed:seedTestUsers] Failed to create client user", {
        error: error instanceof Error ? error.message : String(error),
      });
      results.push(`ERROR creating client user: ${error}`);
    }

    return results.join("\n");
  },
});

/**
 * Seed the coach knowledge base with evidence-based fitness & nutrition documents.
 * Run: npx convex run seedActions:seedKnowledgeBase
 *
 * Inserts 6 starter documents that get chunked and embedded by the existing RAG pipeline.
 * Safe to run multiple times — checks for existing entries by title before inserting.
 */
export const seedKnowledgeBase = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const documents = [
      {
        title: "Nutrition Science Fundamentals",
        tags: ["nutrition"],
        content: `EVIDENCE-BASED NUTRITION SCIENCE FOR FITNESS COACHING

BASAL METABOLIC RATE (BMR) — Mifflin-St Jeor Equation (most accurate for general population):
- Males: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 5 (subtract 5)
- Females: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161 (subtract 161)

TOTAL DAILY ENERGY EXPENDITURE (TDEE) — Activity Multipliers:
- Sedentary (0-1 training days/week): BMR × 1.2
- Lightly active (2-3 days): BMR × 1.375
- Moderately active (4-5 days): BMR × 1.55
- Very active (6-7 days): BMR × 1.725
- Athlete/2x daily training: BMR × 1.9

CALORIC TARGETS BY GOAL:
- Fat Loss: TDEE × 0.80 (20% deficit). Never below 1500 kcal (males) or 1200 kcal (females). Aggressive: 25% deficit max. Rate: 0.5-1% body weight per week.
- Muscle Gain: TDEE × 1.10 (10% surplus). Lean bulk: 200-300 kcal surplus. Rate: 0.25-0.5% body weight per month gain.
- Maintenance/Recomposition: TDEE × 1.0. Best for beginners — can build muscle while maintaining weight.

MACRONUTRIENT GUIDELINES (ISSN Position Stands):
Protein:
- General fitness: 1.4-1.6 g/kg body weight/day
- Fat loss (caloric deficit): 1.8-2.2 g/kg/day (higher protein preserves muscle mass)
- Muscle gain: 1.6-2.0 g/kg/day
- Leucine threshold: ~2.5g per meal for maximal muscle protein synthesis (MPS)
- Distribute evenly: 0.3-0.5g/kg per meal across 4-5 meals
- Post-workout window: consume 20-40g protein within 2 hours of training

Fat:
- Minimum: 0.5 g/kg/day (hormonal health — below this impairs testosterone/estrogen)
- Optimal: 0.8-1.0 g/kg/day
- Prioritize: olive oil, nuts, avocado, fatty fish (omega-3s)
- Saturated fat: <10% of total calories
- Omega-3 target: 1-2g EPA+DHA daily (anti-inflammatory, joint health, brain function)

Carbohydrates:
- Calculated as remaining calories after protein and fat
- Minimum: 50g/day (brain function, thyroid health)
- Endurance athletes: 5-8 g/kg/day
- Strength athletes: 3-5 g/kg/day
- Fat loss: 2-4 g/kg/day (lower end = carb-restricted, not keto)
- Fiber: 25-35g/day from vegetables, legumes, whole grains
- Carb timing: place more carbs around workouts for performance

MEAL TIMING & FREQUENCY:
- 4-5 meals per day optimal for protein distribution and satiety
- Pre-workout (1-2h before): moderate carbs + moderate protein
- Post-workout (within 2h): high protein + high carbs (glycogen replenishment)
- Before bed: casein protein or Greek yogurt (slow-digesting, supports overnight recovery)

HYDRATION:
- Baseline: 35 ml/kg body weight per day
- Add 500-750 ml per hour of exercise
- Electrolytes important in hot climates (MENA region summers)
- Signs of dehydration: dark urine, fatigue, decreased performance

MICRONUTRIENTS OF CONCERN (especially MENA region):
- Vitamin D: very common deficiency in Egypt/Middle East despite sun. 2000-4000 IU/day supplement recommended if deficient. Sources: fatty fish, eggs, fortified foods.
- Iron: critical for females (menstruation), vegetarians. Sources: red meat, lentils, spinach. Pair with vitamin C for absorption.
- Calcium: 1000-1200mg/day. Sources: dairy, labneh, fortified plant milk, leafy greens.
- Magnesium: 300-400mg/day. Sources: nuts, seeds, dark chocolate. Supports sleep and recovery.
- Zinc: 8-11mg/day. Sources: meat, shellfish, legumes. Important for immune function and testosterone.`,
      },
      {
        title: "Egyptian & MENA Food Database",
        tags: ["nutrition"],
        content: `COMMON EGYPTIAN & MENA FOODS — APPROXIMATE MACROS PER SERVING

PROTEINS (per 100g unless noted):
- Chicken breast (grilled): 165 cal, 31g protein, 0g carbs, 3.6g fat
- Beef kofta: 230 cal, 18g protein, 3g carbs, 16g fat
- Eggs (1 large): 70 cal, 6g protein, 0.5g carbs, 5g fat
- Fava beans (foul medames, 1 cup cooked): 187 cal, 13g protein, 33g carbs, 0.7g fat
- Lentils (1 cup cooked): 230 cal, 18g protein, 40g carbs, 0.8g fat
- White cheese (gibna beida, 50g): 130 cal, 8g protein, 1g carbs, 10g fat
- Labneh (2 tbsp): 50 cal, 3g protein, 2g carbs, 3.5g fat
- Greek yogurt (150g): 100 cal, 17g protein, 6g carbs, 0.7g fat
- Sardines (canned, 100g): 208 cal, 25g protein, 0g carbs, 11g fat
- Tuna (canned in water, 100g): 116 cal, 26g protein, 0g carbs, 0.8g fat
- Ta'ameya/Falafel (3 pieces): 170 cal, 7g protein, 18g carbs, 8g fat

CARBOHYDRATES:
- Baladi bread (1 piece, 80g): 210 cal, 7g protein, 42g carbs, 1g fat
- Fino bread (1 roll, 50g): 140 cal, 4g protein, 26g carbs, 2g fat
- White rice (1 cup cooked): 206 cal, 4g protein, 45g carbs, 0.4g fat
- Brown rice (1 cup cooked): 216 cal, 5g protein, 45g carbs, 1.8g fat
- Sweet potato (1 medium, 150g): 135 cal, 2g protein, 31g carbs, 0.1g fat
- Oats (1/2 cup dry): 150 cal, 5g protein, 27g carbs, 3g fat
- Freekeh (1 cup cooked): 200 cal, 8g protein, 38g carbs, 1.5g fat
- Koshari (1 serving, 300g): 450 cal, 15g protein, 80g carbs, 8g fat
- Pasta (1 cup cooked): 220 cal, 8g protein, 43g carbs, 1.3g fat
- Molokhia (1 cup cooked leaves): 35 cal, 4g protein, 4g carbs, 0.5g fat

FATS & SNACKS:
- Olive oil (1 tbsp): 120 cal, 0g protein, 0g carbs, 14g fat
- Tahini (1 tbsp): 90 cal, 3g protein, 3g carbs, 8g fat
- Mixed nuts (30g): 175 cal, 5g protein, 6g carbs, 15g fat
- Peanut butter (2 tbsp): 190 cal, 7g protein, 7g carbs, 16g fat
- Avocado (1/2 medium): 120 cal, 1.5g protein, 6g carbs, 11g fat
- Dates (2 pieces, 30g): 83 cal, 0.5g protein, 22g carbs, 0g fat

COMMON EGYPTIAN MEALS (approximate per serving):
- Foul sandwich (baladi bread + foul): 350 cal, 15g protein, 55g carbs, 8g fat
- Koshari (medium plate): 450 cal, 15g protein, 80g carbs, 8g fat
- Shawarma (chicken, 1 sandwich): 400 cal, 28g protein, 35g carbs, 16g fat
- Grilled chicken with rice: 500 cal, 35g protein, 50g carbs, 12g fat
- Molokhia with rice and chicken: 550 cal, 32g protein, 55g carbs, 18g fat
- Mahshi (stuffed vegetables, 3 pieces): 300 cal, 8g protein, 40g carbs, 12g fat
- Fattah (festive rice & meat): 650 cal, 25g protein, 65g carbs, 30g fat
- Grilled fish with salad: 350 cal, 35g protein, 10g carbs, 18g fat

PROTEIN-RICH BUDGET OPTIONS (Egypt market):
- Eggs: cheapest complete protein source. 6 eggs = ~420 cal, 36g protein
- Canned tuna: affordable, high protein
- Foul medames: very cheap, good protein + carbs + fiber
- Lentils (ads): high protein legume, very affordable
- Chicken thighs: cheaper than breast, slightly higher fat
- Greek yogurt / zabadi: good protein, affordable in Egypt`,
      },
      {
        title: "Exercise Selection Guide",
        tags: ["workout"],
        content: `EVIDENCE-BASED EXERCISE SELECTION FOR PERSONAL TRAINING

COMPOUND MOVEMENT HIERARCHY (highest priority — recruit most muscle, biggest hormonal response):
Tier 1 — Primary Compounds:
- Squat variations: Back squat, front squat, goblet squat
- Hip hinge: Conventional deadlift, Romanian deadlift (RDL), trap bar deadlift
- Horizontal push: Barbell bench press, dumbbell bench press
- Horizontal pull: Barbell row, dumbbell row, cable row
- Vertical push: Overhead press (barbell/dumbbell)
- Vertical pull: Pull-up, chin-up, lat pulldown

Tier 2 — Secondary Compounds:
- Lunges, Bulgarian split squat, step-ups (unilateral leg work)
- Incline bench press, decline bench press
- T-bar row, seated cable row, chest-supported row
- Dips (chest/tricep focus)
- Leg press, hack squat

Tier 3 — Isolation Exercises:
- Bicep curls (barbell, dumbbell, hammer), tricep extensions
- Lateral raises, front raises, rear delt flyes
- Leg extensions, leg curls, calf raises
- Cable crossovers, pec deck
- Face pulls, band pull-aparts

EXERCISE SELECTION BY EXPERIENCE:
Beginners (0-12 months): 80% Tier 1 compounds, 20% Tier 2
- Focus: Learn movement patterns with moderate weight
- Machines are fine initially for safety (leg press, chest press, lat pulldown)
- Bodyweight exercises: push-ups, bodyweight squats, planks

Intermediate (1-3 years): 60% Tier 1, 25% Tier 2, 15% Tier 3
- Add unilateral work for imbalance correction
- Introduce periodization (vary rep ranges)

Advanced (3+ years): 50% Tier 1, 25% Tier 2, 25% Tier 3
- Specialize isolation work for lagging body parts
- Advanced techniques: drop sets, supersets, rest-pause

EQUIPMENT SUBSTITUTIONS (for home/limited gym):
- Barbell squat → Goblet squat (dumbbell) → Bodyweight squat
- Bench press → Dumbbell press → Push-ups (incline/decline variations)
- Barbell row → Dumbbell row → Resistance band row
- Deadlift → Dumbbell RDL → Single-leg deadlift (bodyweight)
- Pull-up → Lat pulldown → Resistance band pulldown
- Overhead press → Dumbbell shoulder press → Pike push-ups
- Leg press → Bulgarian split squat → Lunges
- Cable exercises → Resistance band equivalents

BODYWEIGHT ALTERNATIVES (no equipment needed):
Push: Push-ups, diamond push-ups, pike push-ups, dips (chair)
Pull: Inverted rows (table), door frame rows, resistance band pulls
Legs: Squats, lunges, step-ups, single-leg squats, glute bridges
Core: Planks, dead bugs, mountain climbers, leg raises, bicycle crunches

REP RANGES AND SETS BY GOAL:
- Maximum strength: 1-5 reps, 4-6 sets, 3-5 min rest, RPE 8-9
- Hypertrophy (muscle growth): 6-12 reps, 3-4 sets, 60-90s rest, RPE 7-8
- Muscular endurance: 12-20 reps, 2-3 sets, 30-60s rest, RPE 6-7
- Power: 3-6 reps, 3-5 sets, 2-3 min rest, explosive tempo

TEMPO GUIDELINES:
- Hypertrophy: 2-0-2-0 (2s eccentric, no pause, 2s concentric, no pause)
- Strength: 1-0-1-0 (controlled but not slow)
- Time under tension: 3-1-2-0 (slow eccentric for advanced hypertrophy)`,
      },
      {
        title: "Injury Modification Protocol",
        tags: ["workout", "recovery"],
        content: `INJURY MODIFICATION GUIDELINES FOR PERSONAL TRAINERS

IMPORTANT: These are exercise modification guidelines, not medical advice. Always recommend clients consult a physician for new or worsening injuries.

KNEE INJURIES/PAIN:
Common: Patellofemoral pain, meniscus issues, ACL recovery, general knee soreness
Avoid: Deep squats (below parallel), heavy leg extensions with full ROM, jumping/plyometrics
Substitute:
- Back squat → Box squat (to parallel), leg press (limited ROM), wall sits
- Lunges → Reverse lunges (less knee shear), step-ups (lower box)
- Leg extension → Terminal knee extensions (TKEs) with band, partial ROM leg extensions
- Running → Cycling, swimming, elliptical (low impact cardio)
General: Strengthen VMO (vastus medialis), hamstrings, and glutes. Strong glutes and hamstrings reduce knee stress.

SHOULDER INJURIES/PAIN:
Common: Rotator cuff issues, impingement, labrum problems, shoulder instability
Avoid: Behind-neck press, upright rows, wide-grip bench press, overhead tricep extensions
Substitute:
- Overhead press → Landmine press, high incline neutral grip press
- Bench press → Floor press (limits ROM), neutral grip dumbbell press
- Lateral raises → Cable lateral raises (smoother resistance curve), band pull-aparts
- Dips → Close-grip bench press, diamond push-ups
Prehab: Band external rotations, face pulls, YTW raises, scapular push-ups. Warm up rotator cuff before every upper body session.

LOWER BACK INJURIES/PAIN:
Common: Disc herniation, muscle strain, sciatica, general low back pain
Avoid: Heavy deadlifts from floor, good mornings with heavy weight, sit-ups/crunches, loaded spinal flexion
Substitute:
- Deadlift → Trap bar deadlift (more upright torso), hip thrust, cable pull-through, kettlebell swing
- Back squat → Goblet squat (forces upright torso), leg press, belt squat
- Barbell row → Chest-supported row, cable row (seated), machine row
- Crunches → Dead bugs, bird dogs, Pallof press, planks (anti-extension/rotation core work)
Key: Strengthen core (anti-movement exercises), glutes, and hamstrings. Brace core on all exercises.

WRIST/ELBOW INJURIES:
Common: Carpal tunnel, tennis elbow, golfer's elbow, wrist strain
Avoid: Heavy barbell curls with straight bar, wrist-heavy positions
Substitute:
- Straight bar curls → EZ bar curls, hammer curls (neutral grip)
- Barbell bench → Use fat grips or neutral grip dumbbells
- Pull-ups → Neutral grip pull-ups, strap-assisted grip

GENERAL INJURY MANAGEMENT PRINCIPLES:
1. Pain scale: If exercise causes pain > 3/10, stop and substitute
2. Work around, not through: Train pain-free ranges and movements
3. Reduce load first: Drop weight 30-50% before eliminating exercise
4. Isometrics for pain: Isometric holds at pain-free angles can be analgesic
5. Progressive return: When pain resolves, rebuild volume gradually (50% → 75% → 100% over 2-3 weeks)
6. Bilateral compensation: If one side is injured, train the other side (cross-education effect)
7. Always document injuries in client notes for future reference`,
      },
      {
        title: "Progressive Overload Guidelines",
        tags: ["workout"],
        content: `PROGRESSIVE OVERLOAD — THE FUNDAMENTAL PRINCIPLE OF TRAINING ADAPTATION

Progressive overload means gradually increasing the demands placed on the body to continue making gains. Without it, the body adapts and progress stalls.

METHODS OF PROGRESSIVE OVERLOAD (in order of priority):
1. Increase weight (most direct) — Add 1-2.5kg for upper body, 2.5-5kg for lower body when rep target is met
2. Increase reps — Hit top of rep range for all sets before increasing weight
3. Increase sets (volume) — Add 1 set per exercise per mesocycle
4. Improve form/tempo — Slower eccentrics, fuller ROM, better mind-muscle connection
5. Decrease rest periods — Increases metabolic stress (use sparingly, mainly for fat loss phases)
6. Increase frequency — Train muscle group one more time per week

PROGRESSION BY EXPERIENCE LEVEL:
Beginners (0-12 months):
- Expected gains: can add weight almost every session ("linear progression")
- Strategy: 5-10 reps → when hitting 10 reps for all sets, increase weight, drop back to 5-8 reps
- Rate: increase loads every 1-2 weeks
- Program duration: 8-12 weeks before changing exercises

Intermediate (1-3 years):
- Expected gains: monthly progress, not weekly
- Strategy: periodize — Week 1 (moderate), Week 2 (heavy), Week 3 (hard), Week 4 (deload)
- Use double progression: increase reps within range, then increase weight
- Rate: increase loads every 2-4 weeks
- Program duration: 6-8 weeks per mesocycle

Advanced (3+ years):
- Expected gains: very slow, requires sophisticated programming
- Strategy: block periodization — accumulation phase (high volume) → intensification (heavy loads) → realization (peak)
- Techniques: daily undulating periodization (DUP), autoregulation (RPE-based), accommodating resistance
- Rate: increase loads over months
- Program duration: 4-6 week blocks

VOLUME LANDMARKS (Dr. Mike Israetel's evidence-based framework):
Maintenance Volume (MV): 4-6 sets/muscle/week — minimum to maintain size
Minimum Effective Volume (MEV): 8-10 sets/muscle/week — minimum for growth
Maximum Adaptive Volume (MAV): 12-18 sets/muscle/week — sweet spot for most
Maximum Recoverable Volume (MRV): 20-25 sets/muscle/week — upper limit before overtraining

VOLUME RECOMMENDATIONS BY MUSCLE GROUP (sets per week):
- Chest: MEV 8, MAV 12-16, MRV 22
- Back: MEV 8, MAV 12-18, MRV 25
- Shoulders (side delts): MEV 6, MAV 12-16, MRV 22
- Quads: MEV 6, MAV 10-16, MRV 20
- Hamstrings: MEV 4, MAV 8-12, MRV 16
- Biceps: MEV 4, MAV 8-14, MRV 20
- Triceps: MEV 4, MAV 8-12, MRV 18
- Glutes: MEV 4, MAV 8-12, MRV 16
- Calves: MEV 6, MAV 8-14, MRV 20

DELOAD PROTOCOLS:
When: Every 4-8 weeks, or when performance declines 2+ sessions in a row, or when motivation/sleep/recovery drops
Method 1 (Volume deload): Keep weight same, reduce sets by 50%
Method 2 (Intensity deload): Keep sets same, reduce weight by 40-50%
Method 3 (Full deload): Reduce both volume and intensity, focus on technique
Duration: 1 week
Do NOT skip deloads — they allow accumulated fatigue to dissipate and super-compensation to occur

STALL-BREAKING STRATEGIES:
1. Deload first — often solves the problem
2. Change exercise variation (e.g., flat bench → incline bench)
3. Change rep range (if stuck at 5×5, try 3×10 for 4 weeks)
4. Add a training day for the lagging muscle
5. Increase protein intake (especially in a deficit)
6. Improve sleep quality and duration (7-9 hours target)
7. Reduce life stress where possible (stress = cortisol = impaired recovery)`,
      },
      {
        title: "Recovery & Lifestyle",
        tags: ["recovery"],
        content: `RECOVERY SCIENCE FOR OPTIMAL TRAINING ADAPTATION

SLEEP — THE #1 RECOVERY TOOL:
- Target: 7-9 hours per night. Athletes may need 8-10 hours.
- Quality matters as much as quantity:
  - Keep room cool (18-20°C / 65-68°F)
  - Dark room (blackout curtains or sleep mask)
  - No screens 30-60 min before bed (blue light suppresses melatonin)
  - Consistent sleep/wake times (circadian rhythm)
- Sleep debt is cumulative — can't fully "catch up" on weekends
- Poor sleep (<6 hours) effects on fitness:
  - Reduced testosterone and growth hormone by 10-15%
  - Increased cortisol (muscle breakdown, fat storage)
  - Decreased insulin sensitivity (carbs stored as fat more readily)
  - Impaired motor learning and coordination
  - Increased injury risk by 60%+
  - Appetite dysregulation (increased ghrelin, decreased leptin)

STRESS MANAGEMENT:
- Chronic stress elevates cortisol → muscle loss, fat gain, impaired recovery
- Training is a stressor — high life stress + high training volume = overtraining
- When client reports high stress: reduce training volume by 20-30%, keep intensity moderate
- Recovery practices: meditation, deep breathing, walking in nature, social connection
- The parasympathetic nervous system must be activated for recovery — rest and digest mode

ACTIVE RECOVERY:
- Light movement on rest days improves blood flow and reduces DOMS (Delayed Onset Muscle Soreness)
- Options: 20-30 min walk, light yoga, swimming, foam rolling, dynamic stretching
- Intensity: very low (RPE 2-3/10), should feel refreshing not fatiguing
- Benefits: improved nutrient delivery to muscles, faster waste removal, mental freshness

FOAM ROLLING & STRETCHING:
- Pre-workout: dynamic stretching + foam rolling (60s per muscle group)
  - Increases ROM temporarily, improves warm-up quality
  - Does NOT reduce injury risk alone (must be combined with proper warm-up)
- Post-workout: static stretching (20-30s holds per stretch)
  - Reduces perceived muscle tightness
  - May slightly improve flexibility over time
  - Best done when muscles are warm
- Foam rolling for recovery: 1-2 minutes per muscle group, moderate pressure
  - Reduces DOMS perception
  - Increases blood flow to area
  - Does NOT break up "knots" or "fascia" (this is a myth, but the nervous system benefits)

PERIODIZATION OF TRAINING & RECOVERY:
- Microcycle (1 week): 3-5 training days, 2-4 recovery days
- Mesocycle (4-8 weeks): progressive overload followed by 1 week deload
- Macrocycle (3-6 months): phases of hypertrophy → strength → peak/maintenance
- Recovery needs increase as training stress accumulates — deloads are mandatory

SUPPLEMENTS (evidence-based, not required):
Tier 1 (Strong evidence):
- Creatine monohydrate: 3-5g daily. Most researched supplement. Improves strength, power, muscle growth. Safe long-term.
- Protein powder: convenient for hitting daily protein targets. Whey (fast) or casein (slow). Not superior to whole food protein.
- Caffeine: 3-6mg/kg body weight, 30-60 min pre-workout. Improves performance, focus, endurance.

Tier 2 (Moderate evidence):
- Vitamin D: 2000-4000 IU/day if deficient (very common in MENA region)
- Omega-3 fish oil: 1-2g EPA+DHA daily. Anti-inflammatory, joint health.
- Magnesium: 200-400mg before bed. Improves sleep quality if deficient.

Tier 3 (Weak/emerging evidence):
- Beta-alanine: 3-6g daily. May improve muscular endurance for high-rep work.
- Citrulline malate: 6-8g pre-workout. May improve blood flow and endurance.
- Ashwagandha: 300-600mg daily. May reduce cortisol and improve recovery in stressed individuals.

MONITORING RECOVERY (coach should track):
- Resting heart rate: increase of 5+ bpm from baseline = under-recovered
- Sleep quality rating (1-10 in check-ins)
- Energy level rating (1-10 in check-ins)
- Mood and motivation (subjective but important)
- Performance trend: declining performance over 2+ sessions = need for deload or recovery focus
- Appetite changes: sudden decrease may indicate overtraining`,
      },
    ];

    const results: string[] = [];

    for (const doc of documents) {
      // Check if this document already exists (by title)
      const existing: boolean = await ctx.runQuery(internal.seed.checkKnowledgeExists, {
        title: doc.title,
      });

      if (existing) {
        results.push(`SKIPPED: "${doc.title}" already exists`);
        continue;
      }

      const entryId = await ctx.runMutation(internal.knowledgeBase.insertTextEntryInternal, {
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
      });
      results.push(`CREATED: "${doc.title}" → ${entryId}`);
    }

    return results.join("\n");
  },
});

/**
 * Seed two demo users for testing subscription expiry flows.
 * - nearexpiry@fitfast.app — Active, plan expires in 3 days, fully populated
 * - expired@fitfast.app — Expired 5 days ago, minimal data
 *
 * Run: npx convex run seedActions:seedDemoUsers
 */
export const seedDemoUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword) throw new Error("SEED_USER_PASSWORD env var is required");

    const demoUsers = [
      { email: "nearexpiry@fitfast.app", fullName: "Near Expiry Demo" },
      { email: "expired@fitfast.app", fullName: "Expired Demo" },
    ];

    const results: string[] = [];

    // Delete existing demo users first (idempotent)
    for (const user of demoUsers) {
      try {
        const r = await ctx.runMutation(internal.seed.deleteUserByEmail, {
          email: user.email,
        });
        results.push(r);
      } catch (error) {
        results.push(`Delete ${user.email}: ${error}`);
      }
    }

    // Create both users
    for (const user of demoUsers) {
      try {
        const hashedPassword = await hashPassword(seedPassword);
        const r = await ctx.runMutation(internal.seed.insertAuthUser, {
          email: user.email,
          hashedPassword,
          fullName: user.fullName,
          isCoach: false,
        });
        results.push(r);
      } catch (error) {
        results.push(`Create ${user.email}: ERROR ${error}`);
      }
    }

    // Now populate demo data for each user
    // We need to find the userId for each user from profiles
    for (const user of demoUsers) {
      try {
        const authAccount = await ctx.runQuery(internal.seed.findAuthAccountByEmail, {
          email: user.email,
        });
        if (!authAccount) {
          results.push(`SKIP populate ${user.email}: auth account not found`);
          continue;
        }
        const userId = authAccount.userId;

        if (user.email === "nearexpiry@fitfast.app") {
          const r = await ctx.runMutation(internal.seed.populateNearExpiryUser, { userId });
          results.push(r);
        } else {
          const r = await ctx.runMutation(internal.seed.populateExpiredUser, { userId });
          results.push(r);
        }
      } catch (error) {
        results.push(`Populate ${user.email}: ERROR ${error}`);
      }
    }

    return results.join("\n");
  },
});

export const seedTestUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword) throw new Error("SEED_USER_PASSWORD env var is required");

    const testUsers = [
      {
        email: "testadmin@admin.com",
        fullName: "Coach Admin",
        isCoach: true,
      },
      {
        email: "ziad.adel@scaleflow.digital",
        fullName: "Ziad Adel",
        isCoach: false,
      },
    ];

    const results: string[] = [];

    for (const user of testUsers) {
      try {
        const hashedPassword = await hashPassword(seedPassword);

        const result = await ctx.runMutation(internal.seed.insertAuthUser, {
          email: user.email,
          hashedPassword,
          fullName: user.fullName,
          isCoach: user.isCoach,
        });
        results.push(result);
      } catch (error) {
        console.error("[Seed:seedDemoUsers] Failed to seed user", {
          fullName: user.fullName,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push(`ERROR seeding user: ${error}`);
      }
    }

    return results.join("\n");
  },
});

/**
 * Bulk-create N test users for k6 load testing.
 * Creates loaduser-001@test.com through loaduser-NNN@test.com with pre-hashed passwords.
 *
 * Run: npx convex run seedActions:createLoadTestUsers '{"count": 100}'
 */
export const createLoadTestUsers = internalAction({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, { count }) => {
    assertNotProduction();
    const numUsers = count ?? 50;
    const password = "loadtest12345";
    const results: string[] = [];

    for (let i = 1; i <= numUsers; i++) {
      const padded = String(i).padStart(3, "0");
      const email = `loaduser-${padded}@test.com`;

      try {
        const hashedPassword = await hashPassword(password);
        const result = await ctx.runMutation(internal.seed.insertAuthUser, {
          email,
          hashedPassword,
          fullName: `Load Test User ${padded}`,
          isCoach: false,
        });
        results.push(result);
      } catch (error) {
        results.push(
          `ERROR creating ${email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return `Created ${results.filter((r) => r.startsWith("Created")).length}/${numUsers} load test users.\n${results.join("\n")}`;
  },
});

// ============================================================================
// Food database seeding (previously seedFoodDatabase.ts)
// ============================================================================

type FoodCategory =
  | "protein"
  | "carb"
  | "fat"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "dessert"
  | "recipe";
type FoodSource = "usda" | "coach" | "verified_recipe";

interface FoodEntry {
  name: string;
  nameAr?: string;
  category: FoodCategory;
  tags: string[];
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber?: number };
  isRecipe: boolean;
  servingSize?: string;
  perServing?: { calories: number; protein: number; carbs: number; fat: number };
  ingredients?: string[];
  instructions?: string[];
  source: FoodSource;
  isVerified: boolean;
}

const SEED_FOODS: FoodEntry[] = [
  {
    name: "Chicken Breast (Grilled)",
    nameAr: "صدر دجاج مشوي",
    category: "protein",
    tags: ["high_protein", "low_fat"],
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Chicken Thigh (Skinless)",
    nameAr: "فخذ دجاج بدون جلد",
    category: "protein",
    tags: ["high_protein"],
    per100g: { calories: 177, protein: 24.8, carbs: 0, fat: 8.4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Beef Steak (Lean)",
    nameAr: "ستيك لحم بقري",
    category: "protein",
    tags: ["high_protein"],
    per100g: { calories: 207, protein: 26.1, carbs: 0, fat: 9.7 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Ground Beef (90% Lean, Cooked)",
    nameAr: "لحم مفروم قليل الدهن (مطبوخ)",
    category: "protein",
    tags: ["high_protein"],
    per100g: { calories: 204, protein: 25.2, carbs: 0, fat: 10.8 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Salmon (Atlantic)",
    nameAr: "سلمون",
    category: "protein",
    tags: ["high_protein", "omega_3"],
    per100g: { calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Tuna (Canned Light in Water)",
    nameAr: "تونة معلبة",
    category: "protein",
    tags: ["high_protein", "low_fat", "quick_prep"],
    per100g: { calories: 86, protein: 19.4, carbs: 0, fat: 0.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Tilapia (Baked)",
    nameAr: "بلطي مشوي",
    category: "protein",
    tags: ["high_protein", "low_fat", "egyptian"],
    per100g: { calories: 128, protein: 26.2, carbs: 0, fat: 2.7 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Eggs (Whole, Boiled)",
    nameAr: "بيض مسلوق",
    category: "protein",
    tags: ["high_protein", "quick_prep"],
    per100g: { calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Egg Whites",
    nameAr: "بياض البيض",
    category: "protein",
    tags: ["high_protein", "low_fat", "low_carb"],
    per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Shrimp (Cooked)",
    nameAr: "جمبري مطبوخ",
    category: "protein",
    tags: ["high_protein", "low_fat"],
    per100g: { calories: 99, protein: 22.8, carbs: 1.7, fat: 1.7 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Turkey Breast",
    nameAr: "صدر ديك رومي",
    category: "protein",
    tags: ["high_protein", "low_fat"],
    per100g: { calories: 147, protein: 30, carbs: 0, fat: 2.1 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Greek Yogurt (0% Fat)",
    nameAr: "زبادي يوناني خالي الدسم",
    category: "dairy",
    tags: ["high_protein", "low_fat", "quick_prep"],
    per100g: { calories: 59, protein: 10.2, carbs: 3.6, fat: 0.4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Cottage Cheese (Low Fat)",
    nameAr: "جبن قريش",
    category: "dairy",
    tags: ["high_protein", "low_fat", "egyptian"],
    per100g: { calories: 81, protein: 10.4, carbs: 4.8, fat: 2.3 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Whey Protein (Scoop ~30g)",
    nameAr: "واي بروتين",
    category: "protein",
    tags: ["high_protein", "low_fat", "post_workout"],
    per100g: { calories: 380, protein: 75, carbs: 8, fat: 4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Lentils (Cooked)",
    nameAr: "عدس مطبوخ",
    category: "protein",
    tags: ["high_protein", "high_fiber", "vegan", "egyptian"],
    per100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Chickpeas (Cooked)",
    nameAr: "حمص مطبوخ",
    category: "protein",
    tags: ["high_protein", "high_fiber", "vegan", "middle_eastern"],
    per100g: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Fava Beans (Foul Medames)",
    nameAr: "فول مدمس",
    category: "protein",
    tags: ["high_protein", "high_fiber", "vegan", "egyptian"],
    per100g: { calories: 110, protein: 7.6, carbs: 19.7, fat: 0.4, fiber: 5.4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Labneh",
    nameAr: "لبنة",
    category: "dairy",
    tags: ["high_protein", "middle_eastern"],
    per100g: { calories: 154, protein: 5.7, carbs: 4, fat: 13.5 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "White Rice (Cooked)",
    nameAr: "أرز أبيض مطبوخ",
    category: "carb",
    tags: ["post_workout"],
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Brown Rice (Cooked)",
    nameAr: "أرز بني مطبوخ",
    category: "carb",
    tags: ["high_fiber"],
    per100g: { calories: 112, protein: 2.3, carbs: 23.5, fat: 0.8, fiber: 1.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Sweet Potato (Baked)",
    nameAr: "بطاطا حلوة مشوية",
    category: "carb",
    tags: ["high_fiber"],
    per100g: { calories: 90, protein: 2, carbs: 20.7, fat: 0.1, fiber: 3.3 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Oats (Dry)",
    nameAr: "شوفان جاف",
    category: "carb",
    tags: ["high_fiber", "meal_prep_friendly"],
    per100g: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Baladi Bread (Egyptian)",
    nameAr: "عيش بلدي",
    category: "carb",
    tags: ["egyptian"],
    per100g: { calories: 275, protein: 9, carbs: 57, fat: 1.2, fiber: 2.4 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Banana",
    nameAr: "موز",
    category: "fruit",
    tags: ["quick_prep", "post_workout"],
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Dates (Medjool)",
    nameAr: "تمر",
    category: "fruit",
    tags: ["quick_prep", "middle_eastern", "post_workout"],
    per100g: { calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 6.7 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Olive Oil",
    nameAr: "زيت زيتون",
    category: "fat",
    tags: ["middle_eastern"],
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Almonds",
    nameAr: "لوز",
    category: "fat",
    tags: ["high_protein", "high_fiber", "quick_prep"],
    per100g: { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Peanut Butter",
    nameAr: "زبدة فول سوداني",
    category: "fat",
    tags: ["high_protein", "quick_prep"],
    per100g: { calories: 588, protein: 22, carbs: 24, fat: 50, fiber: 6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Tahini",
    nameAr: "طحينة",
    category: "fat",
    tags: ["middle_eastern", "high_protein"],
    per100g: { calories: 595, protein: 17, carbs: 21.2, fat: 53.8, fiber: 9.3 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Broccoli",
    nameAr: "بروكلي",
    category: "vegetable",
    tags: ["high_fiber", "low_carb"],
    per100g: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Spinach (Raw)",
    nameAr: "سبانخ",
    category: "vegetable",
    tags: ["low_carb"],
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
    isRecipe: false,
    source: "usda",
    isVerified: true,
  },
  {
    name: "Protein Pancakes",
    nameAr: "بان كيك بروتين",
    category: "recipe",
    tags: ["junk_made_healthy", "high_protein", "quick_prep"],
    per100g: { calories: 170, protein: 18, carbs: 18, fat: 3 },
    isRecipe: true,
    servingSize: "3 pancakes (180g)",
    perServing: { calories: 306, protein: 32, carbs: 32, fat: 5.4 },
    ingredients: [
      "1 scoop whey protein",
      "1 banana",
      "2 egg whites",
      "30g oats",
      "1 tsp baking powder",
    ],
    instructions: [
      "Blend all ingredients until smooth",
      "Heat non-stick pan on medium",
      "Pour batter to make 3 pancakes",
      "Cook 2 min each side until golden",
      "Top with berries or honey",
    ],
    source: "verified_recipe",
    isVerified: true,
  },
  {
    name: "Healthy Chicken Shawarma Bowl",
    nameAr: "شاورما دجاج صحية",
    category: "recipe",
    tags: ["junk_made_healthy", "egyptian", "middle_eastern", "high_protein"],
    per100g: { calories: 140, protein: 15, carbs: 12, fat: 4 },
    isRecipe: true,
    servingSize: "1 bowl (350g)",
    perServing: { calories: 490, protein: 52, carbs: 42, fat: 14 },
    ingredients: [
      "200g chicken breast (sliced)",
      "Shawarma spices",
      "100g brown rice",
      "Pickled turnips, cucumber, tomato",
      "30g tahini sauce",
    ],
    instructions: [
      "Marinate chicken in spices for 30 min",
      "Grill or pan-sear chicken until golden",
      "Cook rice and prepare vegetables",
      "Assemble bowl and drizzle tahini",
    ],
    source: "verified_recipe",
    isVerified: true,
  },
  {
    name: "Healthy Koshari",
    nameAr: "كشري صحي",
    category: "recipe",
    tags: ["egyptian", "high_fiber", "vegan", "comfort_food"],
    per100g: { calories: 140, protein: 6, carbs: 25, fat: 2 },
    isRecipe: true,
    servingSize: "1 bowl (350g)",
    perServing: { calories: 490, protein: 21, carbs: 88, fat: 7 },
    ingredients: [
      "100g brown rice (cooked)",
      "50g lentils (cooked)",
      "50g whole wheat pasta (cooked)",
      "Tomato sauce with garlic and vinegar",
      "Crispy onions (air-fried)",
    ],
    instructions: [
      "Cook rice, lentils, and pasta separately",
      "Layer in bowl: rice, lentils, pasta",
      "Top with spiced tomato sauce",
      "Garnish with air-fried crispy onions",
    ],
    source: "verified_recipe",
    isVerified: true,
  },
  {
    name: "Egyptian Lentil Soup",
    nameAr: "شوربة عدس",
    category: "recipe",
    tags: ["egyptian", "high_protein", "high_fiber", "vegan", "comfort_food"],
    per100g: { calories: 80, protein: 5, carbs: 13, fat: 1 },
    isRecipe: true,
    servingSize: "1 bowl (300g)",
    perServing: { calories: 240, protein: 15, carbs: 39, fat: 3 },
    ingredients: [
      "150g red lentils",
      "1 onion, 2 carrots",
      "3 garlic cloves",
      "1 tsp cumin",
      "Lemon juice, salt",
    ],
    instructions: [
      "Sauté onion and garlic",
      "Add lentils, carrots, water",
      "Simmer 20-25 min until soft",
      "Blend until smooth",
      "Season with cumin, lemon, salt",
    ],
    source: "verified_recipe",
    isVerified: true,
  },
];

export const seedFoods = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const existing = await ctx.runQuery(internal.foodDatabase.getFoodReferenceForPrompt);
    if (existing.length > 100) {
      console.log("[Seed] Food database already populated, skipping.");
      return;
    }

    let count = 0;
    for (const food of SEED_FOODS) {
      await ctx.runMutation(internal.foodDatabase.insertFood, { ...food });
      count++;
    }
    console.log(`[Seed] Inserted ${count} foods into foodDatabase.`);
  },
});

// ============================================================================
// Fresh users seed — wipe all and create 1 admin + 3 clients
// ============================================================================

/**
 * Delete ALL users and create a fresh set:
 *   1. coach@fitfast.app — Admin/Coach
 *   2. new@fitfast.app — Brand new client (no assessment → goes to onboarding)
 *   3. expiring@fitfast.app — Active client with 3 days left on subscription
 *   4. done@fitfast.app — Client whose subscription has expired
 *
 * Run: npx convex run seedActions:seedFreshUsers
 */
export const seedFreshUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    assertNotProduction();
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword) throw new Error("SEED_USER_PASSWORD env var is required");

    const results: string[] = [];

    // ── Step 1: Delete ALL existing users ──
    const allEmails = await ctx.runQuery(internal.seed.listAllUserEmails);
    results.push(`Found ${allEmails.length} existing users to delete.`);

    for (const email of allEmails) {
      try {
        const r = await ctx.runMutation(internal.seed.deleteUserByEmail, { email });
        results.push(r);
      } catch (error) {
        results.push(`Delete ${email}: ${error}`);
      }
    }

    // ── Step 2: Create all 4 users ──
    const hashedPassword = await hashPassword(seedPassword);

    const users = [
      { email: "coach@fitfast.app", fullName: "Coach Ahmed", isCoach: true },
      { email: "new@fitfast.app", fullName: "Sara New", isCoach: false },
      { email: "expiring@fitfast.app", fullName: "Omar Expiring", isCoach: false },
      { email: "done@fitfast.app", fullName: "Layla Done", isCoach: false },
    ];

    for (const user of users) {
      try {
        const r = await ctx.runMutation(internal.seed.insertAuthUser, {
          email: user.email,
          hashedPassword,
          fullName: user.fullName,
          isCoach: user.isCoach,
        });
        results.push(r);
      } catch (error) {
        results.push(`Create ${user.email}: ERROR ${error}`);
      }
    }

    // ── Step 3: Configure each client's state ──

    // Client A (new@fitfast.app) — NO assessment, status stays "active" from insertAuthUser
    // They'll be redirected to onboarding/assessment automatically.
    // Just update their profile to "pending_approval" so they go through the full flow.
    try {
      const newAccount = await ctx.runQuery(internal.seed.findAuthAccountByEmail, {
        email: "new@fitfast.app",
      });
      if (newAccount) {
        await ctx.runMutation(internal.seed.setProfileStatus, {
          userId: newAccount.userId,
          status: "active",
          clearPlanDates: true,
        });
        results.push("new@fitfast.app: set to active, no assessment (will onboard)");
      }
    } catch (error) {
      results.push(`Configure new@fitfast.app: ERROR ${error}`);
    }

    // Client B (expiring@fitfast.app) — 3 days left, full demo data
    try {
      const expiringAccount = await ctx.runQuery(internal.seed.findAuthAccountByEmail, {
        email: "expiring@fitfast.app",
      });
      if (expiringAccount) {
        const r = await ctx.runMutation(internal.seed.populateNearExpiryUser, {
          userId: expiringAccount.userId,
        });
        results.push(r);
      }
    } catch (error) {
      results.push(`Configure expiring@fitfast.app: ERROR ${error}`);
    }

    // Client C (done@fitfast.app) — subscription expired
    try {
      const doneAccount = await ctx.runQuery(internal.seed.findAuthAccountByEmail, {
        email: "done@fitfast.app",
      });
      if (doneAccount) {
        const r = await ctx.runMutation(internal.seed.populateExpiredUser, {
          userId: doneAccount.userId,
        });
        results.push(r);
      }
    } catch (error) {
      results.push(`Configure done@fitfast.app: ERROR ${error}`);
    }

    return results.join("\n");
  },
});
