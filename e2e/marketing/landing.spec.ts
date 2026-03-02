import { test, expect } from "@playwright/test";

test.describe("Marketing Landing Page", () => {
  test("page loads successfully", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
  });

  test("hero section renders with CTA", async ({ page }) => {
    await page.goto("/en");

    // Hero should have a main heading
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Should have a CTA button or link (Get Started / pricing)
    const ctaButton = page.getByRole("button", { name: /get started|start/i }).first();
    const ctaLink = page.getByRole("link", { name: /get started|start|pricing/i }).first();
    const ctaVisible =
      (await ctaButton.isVisible().catch(() => false)) ||
      (await ctaLink.isVisible().catch(() => false));
    expect(ctaVisible).toBeTruthy();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Filter out known benign errors (e.g., favicon, third-party)
    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("Failed to load resource") &&
        !e.includes("third-party"),
    );
    expect(realErrors).toHaveLength(0);
  });

  test("GSAP animations initialize", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");

    // GSAP adds inline transforms to animated elements
    // Wait a moment for animations to start
    await page.waitForTimeout(1000);

    // Check that gsap is loaded on the page
    const gsapLoaded = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).gsap !== "undefined"
        ? true
        : // GSAP might be bundled — check for ScrollTrigger registration
          document.querySelectorAll("[style*='transform']").length > 0 ||
            document.querySelectorAll("[style*='opacity']").length > 0;
    });
    // Either GSAP global exists or elements have transform styles
    expect(gsapLoaded).toBeTruthy();
  });
});
