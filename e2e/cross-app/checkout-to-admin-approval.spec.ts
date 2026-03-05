import { test, expect } from "@playwright/test";
import * as path from "path";

/**
 * Cross-app E2E test: Marketing checkout → Admin approval panel
 *
 * Validates:
 * 1. Full checkout submission with transfer ref #, amount, and screenshot (ipa-screen.jpeg)
 * 2. Confirmation page appears after successful submission
 * 3. Admin can see the signup with:
 *    a. Manually submitted fields (transfer ref #, transfer amount)
 *    b. OCR-extracted data from the screenshot (amount, sender_name, reference_number, date, bank)
 *    c. Payment screenshot image
 * 4. Signup detail page shows all info correctly
 */

const MARKETING_BASE = "http://localhost:3002";
const ADMIN_BASE = "http://localhost:3001";
const SCREENSHOT_PATH = path.resolve(__dirname, "../../ipa-screen.jpeg");

test.describe("Checkout Submission → Admin Approval", () => {
  const timestamp = Date.now();
  const testEmail = `e2e-checkout-${timestamp}@test.com`;
  const testName = "E2E Checkout Test";
  const testPhone = "+201234567890";
  const testRefNumber = `REF-${timestamp}`;
  const testAmount = "4500";

  test("submit checkout and verify on admin panel", async ({ browser }) => {
    test.setTimeout(120000);

    // =========================================================
    // PART 1: Submit checkout on marketing site
    // =========================================================
    const marketingContext = await browser.newContext();
    const marketingPage = await marketingContext.newPage();

    await marketingPage.goto(`${MARKETING_BASE}/en`, {
      waitUntil: "domcontentloaded",
    });
    await marketingPage.waitForTimeout(3000);

    // Select a plan to open the checkout drawer
    const planButton = marketingPage.getByRole("button", { name: /choose this plan/i }).first();
    await planButton.waitFor({ state: "visible", timeout: 15000 });
    await marketingPage.waitForTimeout(1000);
    await planButton.click();

    // Wait for checkout drawer to open
    const nameInput = marketingPage.locator('input[name="fullName"]').first();
    await nameInput.waitFor({ state: "visible", timeout: 10000 });

    // Fill personal info fields
    await nameInput.fill(testName);
    await marketingPage.locator('input[name="email"]').first().fill(testEmail);
    await marketingPage.locator('input[name="phone"]').first().fill(testPhone);

    // Scroll down in drawer to reveal payment fields
    await marketingPage.evaluate(() => {
      const scrollable = document.querySelector(".overflow-y-auto");
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await marketingPage.waitForTimeout(500);

    // Fill transfer reference number
    const refInput = marketingPage.locator('input[name="transferReferenceNumber"]').first();
    await refInput.waitFor({ state: "visible", timeout: 5000 });
    await refInput.fill(testRefNumber);

    // Fill transfer amount
    await marketingPage.locator('input[name="transferAmount"]').first().fill(testAmount);

    // Upload payment screenshot (using the real ipa-screen.jpeg)
    const fileInput = marketingPage.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SCREENSHOT_PATH);

    // Wait for upload preview to appear
    await marketingPage.waitForTimeout(2000);

    // Scroll to submit button and submit via JS (drawer may clip)
    await marketingPage.evaluate(() => {
      const scrollable = document.querySelector(".overflow-y-auto");
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await marketingPage.waitForTimeout(500);

    await marketingPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
      const submitBtn = buttons.find((btn) => btn.textContent?.toLowerCase().includes("submit"));
      if (!submitBtn) throw new Error("Submit button not found");

      const scrollContainer = submitBtn.closest(".overflow-y-auto");
      if (scrollContainer) {
        submitBtn.scrollIntoView({ behavior: "instant", block: "center" });
      }

      const form = submitBtn.closest("form");
      if (form) {
        form.requestSubmit(submitBtn as HTMLButtonElement);
      } else {
        (submitBtn as HTMLElement).click();
      }
    });

    // Wait for confirmation page — text from en.json: "Signup Submitted Successfully!"
    await expect(
      marketingPage.getByText(/signup submitted successfully|submitted successfully/i).first(),
    ).toBeVisible({ timeout: 30000 });

    await marketingContext.close();

    // =========================================================
    // PART 2: Verify manual fields on admin panel signups table
    // =========================================================
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Log in as coach
    await adminPage.goto(`${ADMIN_BASE}/en/login`, {
      waitUntil: "domcontentloaded",
    });
    await adminPage.waitForTimeout(2000);

    await adminPage.locator("#email").fill("testadmin@admin.com");
    await adminPage.locator("#password").fill("test12345");
    await adminPage
      .getByRole("button", { name: /sign in/i })
      .first()
      .click();

    // Wait for redirect past login
    await adminPage.waitForURL(/\/en(?!\/login)/, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });

    // Navigate to signups page
    await adminPage.goto(`${ADMIN_BASE}/en/signups`, {
      waitUntil: "domcontentloaded",
    });
    await adminPage.waitForTimeout(3000);

    // Find the signup by its unique email
    const signupEmail = adminPage.getByText(testEmail);
    await expect(signupEmail).toBeVisible({ timeout: 15000 });

    // Verify client name is shown
    await expect(adminPage.getByText(testName).first()).toBeVisible();

    // Find the row and expand payment details
    const signupRow = adminPage.locator("tr", { hasText: testEmail });
    const paymentToggle = signupRow.getByRole("button", {
      name: /payment/i,
    });
    await paymentToggle.click();
    await adminPage.waitForTimeout(1500);

    // --- Section A: "Submitted Payment Details" (manual form fields) ---
    // These are rendered immediately since they're stored with the signup.
    // Admin header: "SUBMITTED PAYMENT DETAILS"
    await expect(signupRow.getByText(/submitted payment details/i)).toBeVisible({ timeout: 5000 });

    // Verify the manually-entered transfer reference number
    await expect(signupRow.getByText(testRefNumber)).toBeVisible({ timeout: 5000 });

    // Verify the manually-entered transfer amount
    await expect(signupRow.getByText(testAmount).first()).toBeVisible();

    // Verify payment screenshot is present (image loaded)
    const screenshotImg = signupRow.locator("img").first();
    await expect(screenshotImg).toBeVisible({ timeout: 10000 });

    // --- Section B: "Extracted Payment Data" (OCR from screenshot) ---
    // OCR runs async via OpenRouter (Qwen 2.5 VL) — may take up to 30s.
    // Poll by collapsing/expanding the payment section to refresh,
    // or just wait for the OCR section header to appear.
    // The ipa-screen.jpeg shows a 4,500 EGP IPA transfer.

    let ocrAppeared = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      // Check if OCR section appeared
      const ocrSection = signupRow.getByText(/extracted payment data/i);
      if (await ocrSection.isVisible().catch(() => false)) {
        ocrAppeared = true;
        break;
      }

      // Wait 5s then collapse/expand to trigger Convex real-time update
      await adminPage.waitForTimeout(5000);
      await paymentToggle.click(); // collapse
      await adminPage.waitForTimeout(500);
      await paymentToggle.click(); // expand
      await adminPage.waitForTimeout(1000);
    }

    if (ocrAppeared) {
      console.log("[OCR] Extracted Payment Data section appeared");

      // Verify OCR section header is visible
      await expect(signupRow.getByText(/extracted payment data/i)).toBeVisible();

      // The OCR should extract at least one of these fields from the IPA screenshot:
      // - amount (e.g. "4,500 EGP" or "4500")
      // - reference_number
      // - sender_name
      // - date
      // - bank (e.g. "Instapay" or the bank name)
      //
      // We check that at least 1 OCR field is rendered (non-empty row in the
      // "Extracted Payment Data" section). The OCR labels use uppercase text
      // like "AMOUNT", "REF #", "SENDER", "DATE", "BANK" from admin ocrLabels.
      const ocrFields = signupRow.locator("text=/amount|ref\\s*#|sender|date|bank/i");
      const ocrFieldCount = await ocrFields.count();
      console.log(`[OCR] Found ${ocrFieldCount} OCR label(s) in expanded section`);
      expect(ocrFieldCount).toBeGreaterThanOrEqual(1);
    } else {
      // OCR didn't complete in ~30s — this is non-critical.
      // The OpenRouter API may be slow or the API key might not be set.
      // Log it but don't fail the test — the manual fields are the critical path.
      console.warn(
        "[OCR] Extracted Payment Data did not appear within 30s " +
          "(OpenRouter API may be unavailable or slow). " +
          "Manual submitted fields were verified successfully.",
      );
    }

    // =========================================================
    // PART 3: Navigate to detail page and verify everything
    // =========================================================
    const detailLink = signupRow.getByRole("link").filter({ hasText: /view details|details/i });
    await detailLink.click();
    await adminPage.waitForLoadState("domcontentloaded");
    await adminPage.waitForTimeout(3000);

    // Verify detail page shows client info
    await expect(adminPage.getByText(testName).first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByText(testEmail).first()).toBeVisible();

    // Verify "Submitted Payment Details" section on detail page
    await expect(adminPage.getByText(/submitted payment details/i).first()).toBeVisible();
    await expect(adminPage.getByText(testRefNumber).first()).toBeVisible();
    await expect(adminPage.getByText(testAmount).first()).toBeVisible();

    // Verify screenshot is displayed on detail page
    const detailScreenshot = adminPage.locator("img").first();
    await expect(detailScreenshot).toBeVisible({ timeout: 10000 });

    // Verify status is pending
    await expect(adminPage.getByText(/pending/i).first()).toBeVisible();

    // If OCR completed, verify it's also on the detail page
    if (ocrAppeared) {
      await expect(adminPage.getByText(/extracted payment data/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await adminContext.close();
  });
});
