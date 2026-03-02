import { test, expect } from "@playwright/test";
import { validateArabicPage } from "../utils/arabic-validator";

test.describe("Client Dashboard — Arabic", () => {
  async function loginAsClientArabic(page: import("@playwright/test").Page) {
    await page.goto("/ar/login");

    await page.locator("#email").fill("client@fitfast.app");
    await page.locator("#password").fill("test12345");

    // Arabic sign in button
    await page
      .getByRole("button", { name: /تسجيل|دخول|sign/i })
      .first()
      .click();

    await page.waitForURL(/\/ar(?!\/login)/, { timeout: 15000 });
  }

  test("dashboard renders in Arabic", async ({ page }) => {
    await loginAsClientArabic(page);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/[\u0600-\u06FF]/);
  });

  test("RTL layout is active", async ({ page }) => {
    await loginAsClientArabic(page);

    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("rtl");
  });

  test("Arabic validator passes on dashboard", async ({ page }) => {
    await loginAsClientArabic(page);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const result = await validateArabicPage(page);

    if (!result.isClean) {
      const details = result.violations
        .slice(0, 10) // Show first 10 violations
        .map((v) => `  ${v.tagName} @ ${v.xpath}: "${v.text}"`)
        .join("\n");
      expect.soft(result.violations, `Arabic violations on dashboard:\n${details}`).toHaveLength(0);
    }
  });

  test("lang attribute is ar", async ({ page }) => {
    await loginAsClientArabic(page);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("ar");
  });
});
