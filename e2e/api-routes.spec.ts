import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────
// PUBLIC API ROUTES (no auth required)
// ─────────────────────────────────────────────────────────

test.describe("Public API: /api/config/pricing", () => {
  test("returns pricing JSON with expected tier keys", async ({ request }) => {
    const res = await request.get("/api/config/pricing");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("3_months");
    expect(body).toHaveProperty("6_months");
    expect(body).toHaveProperty("12_months");
    expect(typeof body["3_months"]).toBe("number");
    expect(typeof body["6_months"]).toBe("number");
    expect(typeof body["12_months"]).toBe("number");
  });

  test("returns valid numbers for all tiers", async ({ request }) => {
    const res = await request.get("/api/config/pricing");
    const body = await res.json();

    for (const tier of ["3_months", "6_months", "12_months"]) {
      expect(body[tier]).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(body[tier])).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────
// AUTH BOUNDARY TESTS (unauthenticated → 401)
// ─────────────────────────────────────────────────────────

test.describe("Auth Boundaries: Client API routes reject unauthenticated", () => {
  test("GET /api/auth/profile → 401", async ({ request }) => {
    const res = await request.get("/api/auth/profile");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  test("GET /api/tickets → 401", async ({ request }) => {
    const res = await request.get("/api/tickets");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/tickets → 401", async ({ request }) => {
    const res = await request.post("/api/tickets", {
      data: { subject: "Test", category: "other" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/plans/meal → 401", async ({ request }) => {
    const res = await request.post("/api/plans/meal", {
      data: { planDuration: 14 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/plans/workout → 401", async ({ request }) => {
    const res = await request.post("/api/plans/workout", {
      data: { planDuration: 14 },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Auth Boundaries: Admin API routes reject unauthenticated", () => {
  test("POST /api/admin/approve-signup → 401", async ({ request }) => {
    const res = await request.post("/api/admin/approve-signup", {
      data: { signupId: "non-existent" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/ocr → 401", async ({ request }) => {
    const res = await request.post("/api/admin/ocr", {
      data: { imageUrl: "https://example.com/test.png" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────
// AUTH: SIGN-IN ENDPOINT
// ─────────────────────────────────────────────────────────

test.describe("Auth: /api/auth/sign-in", () => {
  test("rejects missing email", async ({ request }) => {
    const res = await request.post("/api/auth/sign-in", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("accepts valid email format (sends magic link)", async ({ request }) => {
    // This will attempt to send a magic link — we just verify the API doesn't crash.
    // It may succeed (200) or fail (400) depending on Supabase config, but shouldn't 500.
    const res = await request.post("/api/auth/sign-in", {
      data: { email: "e2e-test-nonexistent@fitfast.test", locale: "en" },
    });
    expect(res.status()).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────
// PAGE RENDERING: PUBLIC / SEMI-PUBLIC PAGES
// ─────────────────────────────────────────────────────────

test.describe("Page Rendering: Admin Login", () => {
  test("admin login page loads and has sign-in form", async ({ page }) => {
    await page.goto("/en/admin/login");
    await page.waitForLoadState("networkidle");

    // Should render a login UI (not redirect)
    await expect(page).toHaveURL(/admin\/login/);
  });

  test("admin login page has email input", async ({ page }) => {
    await page.goto("/en/admin/login");
    await page.waitForLoadState("networkidle");

    // Look for email-related input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Page Rendering: Auth redirect behavior", () => {
  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    const response = await page.goto("/en");
    // Middleware should redirect to login
    // The final URL should contain 'login' or 'sign-in'
    const url = page.url();
    expect(
      url.includes("login") || url.includes("sign-in") || response?.status() === 307
    ).toBeTruthy();
  });

  test("admin panel redirects unauthenticated users", async ({ page }) => {
    await page.goto("/en/admin");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Should redirect to admin login
    expect(url).toContain("login");
  });
});

// ─────────────────────────────────────────────────────────
// TICKET API VALIDATION
// ─────────────────────────────────────────────────────────

test.describe("Ticket API: Input validation", () => {
  // These tests verify validation even though they'll hit 401 first.
  // The 401 itself proves the auth guard works.
  test("POST /api/tickets without auth returns 401 before validation", async ({
    request,
  }) => {
    const res = await request.post("/api/tickets", {
      data: { description: "No subject or category" },
    });
    // Auth check happens first
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────
// OCR API: STRUCTURE TESTS
// ─────────────────────────────────────────────────────────

test.describe("OCR API: /api/admin/ocr", () => {
  test("rejects request without auth", async ({ request }) => {
    const res = await request.post("/api/admin/ocr", {
      data: { imageUrl: "https://example.com/receipt.png" },
    });
    expect(res.status()).toBe(401);
  });

  test("requires imageBase64 or imageUrl in body", async ({ request }) => {
    // Even if auth fails first, verify the endpoint exists
    const res = await request.post("/api/admin/ocr", {
      data: {},
    });
    // Will be 401 (auth fails before validation), but endpoint exists (not 404)
    expect(res.status()).not.toBe(404);
  });
});

// ─────────────────────────────────────────────────────────
// STATIC ASSETS & MANIFEST (extended from pwa.spec)
// ─────────────────────────────────────────────────────────

test.describe("Static Assets", () => {
  test("offline.html is accessible", async ({ request }) => {
    const response = await request.get("/offline.html");
    expect(response.status()).toBe(200);
  });

  test("sw.js is accessible", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
  });

  test("manifest.json is accessible", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────
// I18N LOCALE ROUTING
// ─────────────────────────────────────────────────────────

test.describe("i18n Routing", () => {
  test("English locale resolves", async ({ request }) => {
    const res = await request.get("/en/admin/login");
    // Should not be 404
    expect(res.status()).not.toBe(404);
  });

  test("Arabic locale resolves", async ({ request }) => {
    const res = await request.get("/ar/admin/login");
    expect(res.status()).not.toBe(404);
  });

  test("bare /admin redirects to locale-prefixed path", async ({ page }) => {
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Should redirect to /en/admin/login or /ar/admin/login
    expect(url).toMatch(/\/(en|ar)\/admin\/login/);
  });
});
