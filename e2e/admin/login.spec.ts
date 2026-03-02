import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin Login", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/en/login");

    // Email and password fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Sign in button
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();

    // Coach Panel branding
    await expect(page.getByText("Coach Panel").first()).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await loginAsAdmin(page);

    // Should be on the dashboard (not login)
    await expect(page).not.toHaveURL(/\/login/);

    // Dashboard should show a greeting or stats
    const greeting = page.locator("text=/welcome|dashboard|clients|hello/i").first();
    await expect(greeting).toBeVisible({ timeout: 15000 });
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/en/login");

    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword123");
    await page
      .getByRole("button", { name: /sign in/i })
      .first()
      .click();

    // Error should appear
    await expect(
      page.locator("[class*='red'], [class*='error'], [role='alert']").first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
