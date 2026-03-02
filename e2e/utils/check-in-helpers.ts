import type { Page } from "@playwright/test";

/**
 * Default check-in data for filling the wizard.
 */
export interface CheckInData {
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  workoutPerformance?: string;
  energyLevel?: number;
  sleepQuality?: number;
  dietaryAdherence?: number;
  dietNotes?: string;
  newInjuries?: string;
  notes?: string;
}

const DEFAULTS: Required<CheckInData> = {
  weight: 75.5,
  chest: 0,
  waist: 0,
  hips: 0,
  arms: 0,
  thighs: 0,
  workoutPerformance: "Good progress on all exercises. Increased bench press by 2.5kg.",
  energyLevel: 7,
  sleepQuality: 8,
  dietaryAdherence: 7,
  dietNotes: "Followed the plan closely, enjoyed the recipes.",
  newInjuries: "",
  notes: "",
};

/**
 * Fill step 1 — Weight & Measurements.
 */
export async function fillWeightStep(page: Page, data?: Partial<CheckInData>) {
  const d = { ...DEFAULTS, ...data };

  // Fill weight input (the main number input with placeholder "75.5")
  const weightInput = page.locator('input[type="number"]').first();
  await weightInput.fill(String(d.weight));
}

/**
 * Fill step 2 — Fitness (workout performance, energy, sleep).
 */
export async function fillFitnessStep(page: Page, data?: Partial<CheckInData>) {
  const d = { ...DEFAULTS, ...data };

  // Fill workout performance textarea
  const perfTextarea = page.locator('textarea[name="workoutPerformance"], textarea').first();
  await perfTextarea.fill(d.workoutPerformance);
}

/**
 * Fill step 3 — Dietary (adherence, diet notes).
 */
export async function fillDietaryStep(page: Page, data?: Partial<CheckInData>) {
  const d = { ...DEFAULTS, ...data };

  // Diet notes textarea (first visible textarea on this step)
  const dietTextarea = page.locator("textarea").first();
  if (await dietTextarea.isVisible().catch(() => false)) {
    await dietTextarea.fill(d.dietNotes);
  }
}

/**
 * Skip step 4 — Photos (click Next/Skip without uploading).
 */
export async function skipPhotoStep(page: Page) {
  // Click the Next button to skip photos
  const nextButton = page.getByRole("button", { name: /next|skip|التالي/i }).first();
  if (await nextButton.isVisible().catch(() => false)) {
    await nextButton.click();
  }
}

/**
 * Fill optional notes on step 5 — Review, then submit.
 */
export async function submitReviewStep(page: Page, notes?: string) {
  if (notes) {
    const notesTextarea = page.locator("textarea").first();
    if (await notesTextarea.isVisible().catch(() => false)) {
      await notesTextarea.fill(notes);
    }
  }
}

/**
 * Click the "Next" button to advance to the next step.
 */
export async function clickNext(page: Page) {
  const nextBtn = page.getByRole("button", { name: /next|التالي/i }).first();
  await nextBtn.click();
}

/**
 * Complete the full check-in wizard steps 1–4 (stop before submit).
 * After calling this, the user is on step 5 (review).
 */
export async function completeFullCheckIn(page: Page, data?: Partial<CheckInData>) {
  // Step 1: Weight
  await fillWeightStep(page, data);
  await clickNext(page);
  await page.waitForTimeout(300);

  // Step 2: Fitness
  await fillFitnessStep(page, data);
  await clickNext(page);
  await page.waitForTimeout(300);

  // Step 3: Dietary
  await fillDietaryStep(page, data);
  await clickNext(page);
  await page.waitForTimeout(300);

  // Step 4: Photos — skip
  await skipPhotoStep(page);
  await page.waitForTimeout(300);

  // Now on step 5 (review) — caller decides whether to submit
}
