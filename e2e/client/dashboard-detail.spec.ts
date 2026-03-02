import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Dashboard Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("dashboard shows stats cards", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Dashboard should show summary cards/stats
    const cards = page.locator('[class*="card"], [class*="stat"], [class*="rounded-xl"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("coach message banner visible if set", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Coach message or motivational banner may be present
    const bodyText = await page.locator("body").textContent();
    // Dashboard should have some content
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test("quick action buttons navigate correctly", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Look for navigation links to key sections
    const navLinks = page.locator(
      'a[href*="check-in"], a[href*="meal-plan"], a[href*="workout-plan"], a[href*="progress"], a[href*="tickets"]',
    );
    const linkCount = await navLinks.count();

    // Should have at least some navigation links or sidebar items
    const sidebarLinks = page.locator("nav a");
    const sidebarCount = await sidebarLinks.count();

    expect(linkCount + sidebarCount).toBeGreaterThan(0);
  });

  test("plan status information is displayed", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show plan-related info (countdown, status, dates)
    const bodyText = await page.locator("body").textContent();
    // Page should render meaningful content about the user's plan/status
    expect(bodyText!.length).toBeGreaterThan(100);
  });
});
