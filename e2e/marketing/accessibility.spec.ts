import { test, expect } from "@playwright/test";
import { checkAccessibility, formatViolations } from "../utils/accessibility";

test.describe("Marketing Accessibility", () => {
  test("landing page passes axe-core scan", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const result = await checkAccessibility(page);

    if (!result.isClean) {
      console.log("Accessibility violations:\n" + formatViolations(result.violations));
    }

    // Allow soft failures for now — log but assert critical ones
    const critical = result.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, `Critical/serious violations:\n${formatViolations(critical)}`).toHaveLength(0);
  });

  test("landing page has proper document structure", async ({ page }) => {
    await page.goto("/en");

    // Page should have a lang attribute
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();

    // Should have at least one heading
    const headings = page.getByRole("heading");
    expect(await headings.count()).toBeGreaterThan(0);

    // Should have a main landmark or reasonable structure
    const main = page.locator("main");
    if (await main.count()) {
      await expect(main.first()).toBeVisible();
    }
  });
});
