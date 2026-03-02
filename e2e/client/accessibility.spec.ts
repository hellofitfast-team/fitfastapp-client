import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";
import { checkAccessibility, formatViolations } from "../utils/accessibility";

test.describe("Client Accessibility", () => {
  test("login page passes axe-core scan", async ({ page }) => {
    await page.goto("/en/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const result = await checkAccessibility(page);

    const critical = result.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      critical,
      `Critical/serious violations on login:\n${formatViolations(critical)}`,
    ).toHaveLength(0);
  });

  test("dashboard passes axe-core scan", async ({ page }) => {
    await loginAsClient(page);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const result = await checkAccessibility(page);

    const critical = result.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      critical,
      `Critical/serious violations on dashboard:\n${formatViolations(critical)}`,
    ).toHaveLength(0);
  });
});
