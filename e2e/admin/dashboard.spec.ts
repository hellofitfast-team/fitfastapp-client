import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard shows stats cards", async ({ page }) => {
    // Should see stat cards (clients, pending signups, etc.)
    const cards = page.locator('[class*="card"], [class*="stat"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test("sidebar navigation works", async ({ page }) => {
    // Sidebar should have navigation links
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [role="navigation"]');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });

    // Navigate to clients page via sidebar
    const clientsLink = page.getByRole("link", { name: /clients/i }).first();
    if (await clientsLink.isVisible()) {
      await clientsLink.click();
      await expect(page).toHaveURL(/\/clients/, { timeout: 10000 });
    }
  });

  test("greeting shows admin name or welcome text", async ({ page }) => {
    // Dashboard should show a greeting or welcome message
    await expect(page.locator("text=/welcome|hello|hey|coach/i").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
