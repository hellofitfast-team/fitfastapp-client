import { test, expect } from "@playwright/test";
import { validateArabicPage } from "../utils/arabic-validator";

test.describe("Admin Panel — Arabic", () => {
  async function loginAsAdminArabic(page: import("@playwright/test").Page) {
    await page.goto("/ar/login");

    await page.locator("#email").fill("testadmin@admin.com");
    await page.locator("#password").fill("test12345");

    // Arabic sign in button
    await page
      .getByRole("button", { name: /تسجيل|دخول|sign/i })
      .first()
      .click();

    await page.waitForURL(/\/ar(?!\/login)/, { timeout: 30000 });
  }

  test("login page renders in Arabic", async ({ page }) => {
    await page.goto("/ar/login");

    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("rtl");

    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("ar");
  });

  test("dashboard renders in Arabic after login", async ({ page }) => {
    await loginAsAdminArabic(page);

    // Dashboard should show Arabic text
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/[\u0600-\u06FF]/);
  });

  test("sidebar labels are in Arabic", async ({ page }) => {
    await loginAsAdminArabic(page);

    const sidebar = page.locator('nav, aside, [class*="sidebar"], [role="navigation"]');
    if (
      await sidebar
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      const sidebarText = await sidebar.first().textContent();
      if (sidebarText) {
        expect(sidebarText).toMatch(/[\u0600-\u06FF]/);
      }
    }
  });

  test("RTL layout direction", async ({ page }) => {
    await loginAsAdminArabic(page);

    const bodyDir = await page.evaluate(() => {
      return window.getComputedStyle(document.body).direction;
    });
    expect(bodyDir).toBe("rtl");
  });
});
