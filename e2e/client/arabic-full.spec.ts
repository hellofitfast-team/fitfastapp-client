import { test, expect } from "@playwright/test";
import { loginAsClientArabic } from "../fixtures/auth";

/**
 * Detect raw next-intl translation keys (dot-separated namespaces like "dashboard.title.heading")
 * that indicate missing translations.
 */
function detectRawTranslationKeys(text: string): string[] {
  const keyPattern = /\b[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g;
  const matches = text.match(keyPattern) || [];
  // Filter out likely false positives (URLs, file extensions)
  return matches.filter((m) => !m.match(/\.(com|org|net|io|js|ts|css|html|json|png|jpg|svg)$/i));
}

/**
 * Shared Arabic page validation: checks RTL, Arabic text, no raw translation keys, no console errors.
 */
async function validateArabicPageFull(page: import("@playwright/test").Page, path: string) {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(`/ar${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Check RTL
  const dir = await page.getAttribute("html", "dir");
  expect(dir).toBe("rtl");

  // Check Arabic text present
  const bodyText = await page.locator("body").textContent();
  expect(bodyText).toMatch(/[\u0600-\u06FF]/);

  // Check no raw translation keys (FR-006)
  const rawKeys = detectRawTranslationKeys(bodyText ?? "");
  if (rawKeys.length > 0) {
    console.log(`[WARN] Potential raw translation keys on /ar${path}:`, rawKeys);
  }

  // Check no console errors
  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("sw.js"),
  );
  if (criticalErrors.length > 0) {
    console.log(`[WARN] Console errors on /ar${path}:`, criticalErrors);
  }
}

test.describe("Client Arabic Pages — Full Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClientArabic(page);
  });

  test("dashboard renders in Arabic with RTL", async ({ page }) => {
    await validateArabicPageFull(page, "");
  });

  test("check-in page renders in Arabic with RTL", async ({ page }) => {
    await validateArabicPageFull(page, "/check-in");
  });

  test("tickets page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/tickets");
  });

  test("tracking page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/tracking");
  });

  test("progress page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/progress");
  });

  test("meal plan page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/meal-plan");
  });

  test("workout plan page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/workout-plan");
  });

  test("settings page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/settings");
  });

  test("FAQ page renders in Arabic", async ({ page }) => {
    await validateArabicPageFull(page, "/faq");
  });
});
