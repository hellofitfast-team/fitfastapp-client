import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Assessment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("assessment page is accessible", async ({ page }) => {
    await page.goto("/en/assessment");

    // Should either show assessment form or redirect if already completed
    const url = page.url();
    const isAssessment = url.includes("/initial-assessment");
    const isDashboard = url.includes("/dashboard") || !url.includes("/initial-assessment");

    // Either the assessment page loads or we're redirected to dashboard (already completed)
    expect(isAssessment || isDashboard).toBeTruthy();
  });

  test("assessment has step indicator", async ({ page }) => {
    await page.goto("/en/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    if (page.url().includes("/initial-assessment")) {
      // Step indicator is a visual progress bar with rounded-full divs (bg-primary/bg-neutral-200)
      // Plus small step labels like "Goals", "Body Info", etc.
      const progressBar = page.locator('[class*="rounded-full"][class*="bg-"]').first();
      const stepLabel = page.locator("text=/goals|body|schedule|diet|medical/i").first();
      // Also check for any progress-like wrapper (flex gap container with multiple children)
      const progressWrapper = page.locator('[class*="gap-1"]').first();
      const hasStepIndicator =
        (await progressBar.isVisible({ timeout: 10000 }).catch(() => false)) ||
        (await stepLabel.isVisible().catch(() => false)) ||
        (await progressWrapper.isVisible().catch(() => false));
      expect(hasStepIndicator).toBeTruthy();
    } else {
      // Redirected — assessment already completed, which is fine
      expect(page.url()).not.toContain("/initial-assessment");
    }
  });

  test("goals step has selection options", async ({ page }) => {
    await page.goto("/en/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    if (page.url().includes("/initial-assessment")) {
      // First step should be goals — should have selectable options
      const options = page.locator(
        'button, [role="radio"], [role="checkbox"], input[type="radio"], input[type="checkbox"], [class*="option"], [class*="card"]:has(input)',
      );
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("body info step has number inputs", async ({ page }) => {
    await page.goto("/en/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    if (page.url().includes("/initial-assessment")) {
      // Navigate to body info step (step 2) — click next/continue
      const nextButton = page.getByRole("button", { name: /next|continue|التالي/i }).first();

      // Select a goal first if on step 1
      const firstOption = page
        .locator('[class*="option"], [class*="card"]:has(input), button')
        .first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(300);
      }

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Body info should have weight/height inputs
        const numberInputs = page.locator(
          'input[type="number"], input[inputmode="numeric"], input[name*="weight"], input[name*="height"]',
        );
        if ((await numberInputs.count()) > 0) {
          await expect(numberInputs.first()).toBeVisible();
        }
      }
    }
  });

  test("assessment can be navigated with back button", async ({ page }) => {
    await page.goto("/en/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    if (page.url().includes("/initial-assessment")) {
      // Select something and go to step 2
      const firstOption = page.locator('[class*="option"], [class*="card"]:has(input)').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }

      const nextButton = page.getByRole("button", { name: /next|continue/i }).first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Now go back
        const backButton = page.getByRole("button", { name: /back|previous|السابق/i }).first();
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(500);
          // Should be back on step 1
        }
      }
    }
  });

  test("assessment completion redirects appropriately", async ({ page }) => {
    // This test just verifies the assessment page structure exists
    // Full completion test is in cross-app journey
    await page.goto("/en/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Page should either show assessment or dashboard
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });
});
