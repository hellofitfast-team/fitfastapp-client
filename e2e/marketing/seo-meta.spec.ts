import { test, expect } from "@playwright/test";

test.describe("Marketing SEO Meta", () => {
  test("landing page has proper meta tags", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Check title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);

    // Check meta description
    const metaDesc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(metaDesc).toBeTruthy();
    expect(metaDesc!.length).toBeGreaterThan(10);

    // Check OG tags
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content")
      .catch(() => null);
    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content")
      .catch(() => null);

    // At least one OG tag should exist
    expect(ogTitle || ogDesc).toBeTruthy();
  });

  test("Arabic landing page has Arabic meta content", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(3);

    // Check that html lang is set to Arabic
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("ar");

    // Check dir is RTL
    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("rtl");
  });

  test("page has viewport meta tag", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");

    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toBeTruthy();
    expect(viewport).toContain("width=device-width");
  });
});
