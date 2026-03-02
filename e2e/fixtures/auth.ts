import { type Page } from "@playwright/test";

/**
 * Log in as the seed client user on the client app.
 *
 * Both apps use custom login forms (not Clerk) powered by @convex-dev/auth.
 * The forms have inputs with id="email" and id="password", and a submit
 * button whose visible text comes from i18n translations.
 *
 * Client login button text: "Sign In"
 * Admin login button text: "Coach Sign In" (but also matches "Sign In")
 */
export async function loginAsClient(page: Page) {
  await page.goto("/en/login");

  // Fill the custom form inputs by their HTML id attributes
  await page.locator("#email").fill("client@fitfast.app");
  await page.locator("#password").fill("test12345");

  // The client submit button text is "Sign In" — use exact match to avoid
  // matching "Sign in with magic link" button
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Wait for navigation away from the login page
  await page.waitForURL(/\/en(?!\/login)/, { timeout: 30000, waitUntil: "domcontentloaded" });
}

/**
 * Log in as the seed admin/coach user on the admin app.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/en/login");

  await page.locator("#email").fill("testadmin@admin.com");
  await page.locator("#password").fill("test12345");

  // The admin submit button text is "Coach Sign In" (from admin.signIn translation)
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click();

  // Wait for navigation away from the login page
  await page.waitForURL(/\/en(?!\/login)/, { timeout: 30000, waitUntil: "domcontentloaded" });
}

/**
 * Log in as the seed client user on the Arabic locale.
 */
export async function loginAsClientArabic(page: Page) {
  await page.goto("/ar/login");

  await page.locator("#email").fill("client@fitfast.app");
  await page.locator("#password").fill("test12345");

  // Arabic sign in button
  await page
    .getByRole("button", { name: /تسجيل|دخول|sign/i })
    .first()
    .click();

  await page.waitForURL(/\/ar(?!\/login)/, { timeout: 30000, waitUntil: "domcontentloaded" });
}

/**
 * Log in as the seed admin/coach user on the Arabic locale.
 */
export async function loginAsAdminArabic(page: Page) {
  await page.goto("/ar/login");

  await page.locator("#email").fill("testadmin@admin.com");
  await page.locator("#password").fill("test12345");

  await page
    .getByRole("button", { name: /تسجيل|دخول|sign/i })
    .first()
    .click();

  await page.waitForURL(/\/ar(?!\/login)/, { timeout: 30000, waitUntil: "domcontentloaded" });
}
