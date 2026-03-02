import { test, expect } from "@playwright/test";

test.describe("Onboarding Pending", () => {
  test("pending page shows waiting message", async ({ page }) => {
    await page.goto("/en/pending");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should show review/pending status or redirect
    const bodyText = await page.locator("body").textContent();
    const isPendingPage = /review|pending|under review|قيد المراجعة/i.test(bodyText ?? "");
    const wasRedirected = /login|dashboard|welcome/i.test(page.url());

    expect(isPendingPage || wasRedirected).toBeTruthy();
  });

  test("pending page shows progress steps", async ({ page }) => {
    await page.goto("/en/pending");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    if (page.url().includes("/pending")) {
      // Should show step indicators (signup complete, under review, approval notification)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/complete|review|notification|approval/i);
    }
  });
});
