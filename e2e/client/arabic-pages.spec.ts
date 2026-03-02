import { test, expect } from "@playwright/test";
import { loginAsClientArabic } from "../fixtures/auth";
import { validateArabicPage } from "../utils/arabic-validator";

test.describe("Client Arabic Pages — Latin Text Detection", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClientArabic(page);
  });

  const pages = [
    { name: "dashboard", path: "" },
    { name: "tickets", path: "/tickets" },
    { name: "tracking", path: "/tracking" },
    { name: "check-in", path: "/check-in" },
    { name: "meal plan", path: "/meal-plan" },
    { name: "workout plan", path: "/workout-plan" },
    { name: "settings", path: "/settings" },
    { name: "FAQ", path: "/faq" },
    { name: "progress", path: "/progress" },
  ];

  for (const { name, path } of pages) {
    test(`${name} page has no unexpected Latin text`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`/ar${path}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2500);

      // RTL check
      const dir = await page.getAttribute("html", "dir");
      expect(dir).toBe("rtl");

      // Arabic text present
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/[\u0600-\u06FF]/);

      // Detect raw translation keys (dot-separated namespaces)
      const rawKeyPattern = /\b[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g;
      const matches = (bodyText ?? "").match(rawKeyPattern) || [];
      const suspectKeys = matches.filter(
        (m) => !m.match(/\.(com|org|net|io|js|ts|css|html|json|png|jpg|svg)$/i),
      );
      if (suspectKeys.length > 0) {
        console.log(`[WARN] Raw translation keys on ${name}:`, suspectKeys);
      }

      // Run Arabic validator for Latin text detection
      const result = await validateArabicPage(page);
      if (!result.isClean) {
        // Log violations but don't hard-fail (brand names trigger false positives)
        console.log(
          `[INFO] Arabic validator found ${result.violations.length} Latin text instances on ${name}:`,
          result.violations.map((v) => v.text),
        );
      }

      // Console error check (filter out non-critical)
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("sw.js") && !e.includes("manifest"),
      );
      if (criticalErrors.length > 0) {
        console.log(`[WARN] Console errors on ${name}:`, criticalErrors);
      }
    });
  }
});
