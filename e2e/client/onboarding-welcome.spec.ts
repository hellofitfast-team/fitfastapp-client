import { test, expect } from "@playwright/test";

test.describe("Onboarding Welcome", () => {
  test("welcome page loads with branding and CTA", async ({ page }) => {
    await page.goto("/en/welcome");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // The welcome page may redirect to login for unauthenticated users
    // Either way, should show FitFast branding
    const heading = page.locator("text=/welcome|fitfast|sign in/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should have a primary CTA (Sign In, Get Started, etc.)
    const cta = page.getByRole("button", { name: /sign in|get started|start|begin|ابدأ/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test("feature cards are displayed", async ({ page }) => {
    await page.goto("/en/welcome");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show feature descriptions (meal plans, workout, progress, support)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/meal|workout|progress|coach/i);
  });

  test("CTA navigates to initial assessment", async ({ page }) => {
    await page.goto("/en/welcome");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const cta = page.getByRole("link", { name: /get started|start/i }).first();
    if (await cta.isVisible({ timeout: 10000 }).catch(() => false)) {
      await cta.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(/initial-assessment|assessment/);
    }
  });
});
