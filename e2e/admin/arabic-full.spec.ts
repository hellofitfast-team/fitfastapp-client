import { test, expect } from "@playwright/test";
import { loginAsAdminArabic } from "../fixtures/auth";

/**
 * Detect raw next-intl translation keys (dot-separated namespaces)
 */
function detectRawTranslationKeys(text: string): string[] {
  const keyPattern = /\b[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g;
  const matches = text.match(keyPattern) || [];
  return matches.filter((m) => !m.match(/\.(com|org|net|io|js|ts|css|html|json|png|jpg|svg)$/i));
}

async function validateAdminArabicPage(page: import("@playwright/test").Page, path: string) {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(`/ar${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const dir = await page.getAttribute("html", "dir");
  expect(dir).toBe("rtl");

  const bodyText = await page.locator("body").textContent();
  expect(bodyText).toMatch(/[\u0600-\u06FF]/);

  const rawKeys = detectRawTranslationKeys(bodyText ?? "");
  if (rawKeys.length > 0) {
    console.log(`[WARN] Raw translation keys on /ar${path}:`, rawKeys);
  }

  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("sw.js"),
  );
  if (criticalErrors.length > 0) {
    console.log(`[WARN] Console errors on /ar${path}:`, criticalErrors);
  }
}

test.describe("Admin Arabic Full Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminArabic(page);
  });

  test("dashboard renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "");
  });

  test("signups page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/signups");
  });

  test("clients page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/clients");
  });

  test("tickets page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/tickets");
  });

  test("knowledge page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/knowledge");
  });

  test("FAQs page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/faqs");
  });

  test("settings page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/settings");
  });

  test("notifications page renders in Arabic with RTL", async ({ page }) => {
    await validateAdminArabicPage(page, "/notifications");
  });
});
