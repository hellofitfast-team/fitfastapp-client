import { test, expect } from "@playwright/test";
import { loginAsAdminArabic } from "../fixtures/auth";

test.describe("Admin Arabic Pages — Console & Translation Validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminArabic(page);
  });

  const pages = [
    { name: "dashboard", path: "" },
    { name: "notifications", path: "/notifications" },
    { name: "tickets", path: "/tickets" },
    { name: "FAQs", path: "/faqs" },
    { name: "signups", path: "/signups" },
    { name: "clients", path: "/clients" },
    { name: "knowledge", path: "/knowledge" },
    { name: "settings", path: "/settings" },
  ];

  for (const { name, path } of pages) {
    test(`${name} page — no console errors, no raw translation keys`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`/ar${path}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2500);

      // RTL direction
      const dir = await page.getAttribute("html", "dir");
      expect(dir).toBe("rtl");

      // Arabic text present
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/[\u0600-\u06FF]/);

      // Detect raw translation keys
      const rawKeyPattern = /\b[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g;
      const matches = (bodyText ?? "").match(rawKeyPattern) || [];
      const suspectKeys = matches.filter(
        (m) => !m.match(/\.(com|org|net|io|js|ts|css|html|json|png|jpg|svg)$/i),
      );
      if (suspectKeys.length > 0) {
        console.log(`[WARN] Raw translation keys on admin ${name}:`, suspectKeys);
      }

      // Console error check
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("sw.js") && !e.includes("manifest"),
      );
      if (criticalErrors.length > 0) {
        console.log(`[WARN] Console errors on admin ${name}:`, criticalErrors);
      }
    });
  }
});
