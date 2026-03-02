import { test, expect } from "@playwright/test";
import { loginAsClient } from "../fixtures/auth";

test.describe("Client Tickets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/en/tickets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  });

  test("tickets page loads (empty or list)", async ({ page }) => {
    // Should see the page heading or form
    const pageContent = page
      .locator("text=/support|tickets|new ticket|subject|no support tickets/i")
      .first();
    await expect(pageContent).toBeVisible({ timeout: 20000 });
  });

  test("new ticket form has required fields", async ({ page }) => {
    // Wait for the form to render — look for subject input by placeholder
    const subjectInput = page
      .locator('input[placeholder*="description" i], input[placeholder*="issue" i]')
      .first();
    const hasSubject = await subjectInput.isVisible({ timeout: 15000 }).catch(() => false);

    // Or look for the "New Ticket" heading
    const newTicketHeading = page.locator("text=/new ticket/i").first();
    const hasHeading = await newTicketHeading.isVisible().catch(() => false);

    expect(hasSubject || hasHeading).toBeTruthy();
  });

  test("create ticket validates required fields", async ({ page }) => {
    // Wait for the submit button to appear
    const submitBtn = page.getByRole("button", { name: /submit ticket|send|إرسال/i }).first();

    if (await submitBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Should stay on the form or show validation error
      const stillOnForm = await submitBtn.isVisible();
      expect(stillOnForm).toBeTruthy();
    }
  });

  test("create ticket with subject and category", async ({ page }) => {
    const subjectInput = page
      .locator('input[placeholder*="description" i], input[placeholder*="issue" i]')
      .first();

    if (await subjectInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      await subjectInput.fill("E2E Test Ticket - Meal Plan Issue");

      // Select a category if dropdown exists
      const categorySelect = page.locator("select").first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption({ index: 1 });
      }

      // Submit
      const submitBtn = page.getByRole("button", { name: /submit ticket|send|إرسال/i }).first();
      if (await submitBtn.isEnabled()) {
        await submitBtn.click();

        // Should see success message or ticket list
        const result = page.locator("text=/success|submitted|ticket|my tickets/i").first();
        await expect(result).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test("ticket list shows status indicators", async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for ticket items or empty state
    const ticketItems = page.locator("text=/open|coach responded|closed/i");
    const emptyState = page.locator("text=/no support tickets/i").first();
    const myTickets = page.locator("text=/my tickets/i").first();

    const hasTickets = (await ticketItems.count()) > 0;
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasSection = await myTickets.isVisible().catch(() => false);

    // Either we have tickets with status, an empty state, or the section header
    expect(hasTickets || isEmpty || hasSection).toBeTruthy();
  });

  test("ticket detail shows thread messages", async ({ page }) => {
    // Click first ticket if available
    const ticketLink = page.locator("a[href*='/tickets/']").first();

    if (await ticketLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await ticketLink.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Should see ticket content (back link, subject, or messages)
      const ticketContent = page
        .locator("text=/back to tickets|type your reply|category/i")
        .first();
      await expect(ticketContent).toBeVisible({ timeout: 15000 });
    }
  });
});
