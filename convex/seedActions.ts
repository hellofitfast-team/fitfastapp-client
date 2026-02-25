"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
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
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword)
      throw new Error("SEED_USER_PASSWORD env var is required");

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
        console.error(`Failed to delete user ${email}:`, error);
        results.push(`ERROR deleting ${email}: ${error}`);
      }
    }

    // Create fresh client
    const hashedPassword = hashPassword(seedPassword);
    try {
      const r = await ctx.runMutation(internal.seed.insertAuthUser, {
        email: "client@fitfast.app",
        hashedPassword,
        fullName: "Ziad Adel",
        isCoach: false,
      });
      results.push(r);
    } catch (error) {
      console.error("Failed to create client user:", error);
      results.push(`ERROR creating client@fitfast.app: ${error}`);
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
      const existing: boolean = await ctx.runQuery(
        internal.seed.checkKnowledgeExists,
        { title: doc.title },
      );

      if (existing) {
        results.push(`SKIPPED: "${doc.title}" already exists`);
        continue;
      }

      const entryId = await ctx.runMutation(
        internal.knowledgeBase.insertTextEntryInternal,
        { title: doc.title, content: doc.content, tags: doc.tags },
      );
      results.push(`CREATED: "${doc.title}" → ${entryId}`);
    }

    return results.join("\n");
  },
});

export const seedTestUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword)
      throw new Error("SEED_USER_PASSWORD env var is required");

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
        const hashedPassword = hashPassword(seedPassword);

        const result = await ctx.runMutation(internal.seed.insertAuthUser, {
          email: user.email,
          hashedPassword,
          fullName: user.fullName,
          isCoach: user.isCoach,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to seed user ${user.email}:`, error);
        results.push(`ERROR seeding ${user.email}: ${error}`);
      }
    }

    return results.join("\n");
  },
});
