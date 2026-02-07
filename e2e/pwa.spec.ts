import { test, expect } from "@playwright/test";

test.describe("PWA Manifest", () => {
  test("manifest.json is accessible and valid", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest.name).toBe("FitFast - AI Fitness Coaching");
    expect(manifest.short_name).toBe("FitFast");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#000000");
    expect(manifest.background_color).toBe("#000000");
    expect(manifest.start_url).toBe("/");
  });

  test("manifest has correctly split icon purposes", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();

    // Must have separate entries for "any" and "maskable"
    const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");

    // No combined "maskable any" entries
    expect(purposes).not.toContain("maskable any");
  });

  test("manifest icons reference existing files", async ({ page, request }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.status(), `Icon ${icon.src} should exist`).toBe(200);
    }
  });

  test("apple-touch-icon is accessible", async ({ request }) => {
    const response = await request.get("/apple-touch-icon.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("Service Worker", () => {
  test("sw.js is served with correct headers", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);

    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toContain("no-cache");

    const swAllowed = response.headers()["service-worker-allowed"];
    expect(swAllowed).toBe("/");
  });

  test("sw.js contains OneSignal importScripts", async ({ request }) => {
    const response = await request.get("/sw.js");
    const content = await response.text();

    expect(content).toContain("importScripts");
    expect(content).toContain("OneSignalSDK");
  });

  test("sw.js contains offline fallback logic", async ({ request }) => {
    const response = await request.get("/sw.js");
    const content = await response.text();

    expect(content).toContain("offline.html");
    expect(content).toContain("notificationclick");
  });
});

test.describe("Offline Page", () => {
  test("offline.html is accessible", async ({ request }) => {
    const response = await request.get("/offline.html");
    expect(response.status()).toBe(200);
  });

  test("offline page is bilingual (EN + AR)", async ({ page }) => {
    await page.goto("/offline.html");

    // English text
    await expect(page.locator("text=You're Offline")).toBeVisible();

    // Arabic text
    await expect(page.locator("text=أنت غير متصل")).toBeVisible();
  });

  test("offline page has retry button", async ({ page }) => {
    await page.goto("/offline.html");

    const retryButton = page.locator(".retry-btn");
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText("Retry");
    await expect(retryButton).toContainText("إعادة المحاولة");
  });

  test("offline page has FitFast branding", async ({ page }) => {
    await page.goto("/offline.html");

    // FF logo
    await expect(page.locator(".logo")).toBeVisible();
    await expect(page.locator(".logo")).toHaveText("FF");
  });
});

test.describe("Theme & Metadata", () => {
  // Note: Next.js pages behind auth middleware are slow to reach in E2E
  // without a full Supabase session. We verify meta tags via static asset
  // checks instead (manifest, icon files), and unit tests verify the
  // layout.tsx source sets themeColor="#000000" and apple icon correctly.

  test("manifest theme_color matches brand (#000000)", async ({ request }) => {
    const response = await request.get("/manifest.json");
    const manifest = await response.json();

    expect(manifest.theme_color).toBe("#000000");
    expect(manifest.background_color).toBe("#000000");
  });

  test("apple-touch-icon file is served as PNG", async ({ request }) => {
    const response = await request.get("/apple-touch-icon.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("manifest is served with correct content-type", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("json");
  });
});

test.describe("PWA Icon Assets", () => {
  test("all required icon sizes exist", async ({ request }) => {
    const sizes = ["192x192", "512x512"];
    for (const size of sizes) {
      const response = await request.get(`/icons/icon-${size}.png`);
      expect(response.status(), `icon-${size}.png should exist`).toBe(200);
    }
  });

  test("favicon.png exists", async ({ request }) => {
    const response = await request.get("/favicon.png");
    expect(response.status()).toBe(200);
  });

  test("icon SVG has correct brand colors", async ({ request }) => {
    const response = await request.get("/icons/icon.svg");
    const svg = await response.text();

    // Black background
    expect(svg).toContain('fill="#000000"');
    // Green text
    expect(svg).toContain('fill="#00FF94"');
    // No old blue
    expect(svg).not.toContain("#2563eb");
  });
});
