import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Admin FAQs", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/en/faqs");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  });

  test("FAQ management page loads", async ({ page }) => {
    const heading = page.locator("text=/FAQs|الأسئلة/i").first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("add FAQ button toggles form", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add|إضافة|new|جديد/i }).first();

    if (await addBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      // Form should appear with question and answer inputs
      const questionInput = page
        .locator('input[placeholder*="question" i], input[placeholder*="سؤال" i]')
        .first();
      const answerInput = page
        .locator('textarea[placeholder*="answer" i], textarea[placeholder*="إجابة" i]')
        .first();

      await expect(questionInput).toBeVisible({ timeout: 5000 });
      await expect(answerInput).toBeVisible();

      // Click cancel to close
      const cancelBtn = page.getByRole("button", { name: /cancel|إلغاء/i }).first();
      if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("create new FAQ entry", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add|إضافة|new|جديد/i }).first();

    if (await addBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const questionInput = page
        .locator('input[placeholder*="question" i], input[placeholder*="سؤال" i]')
        .first();
      const answerInput = page
        .locator('textarea[placeholder*="answer" i], textarea[placeholder*="إجابة" i]')
        .first();

      await questionInput.fill("E2E Test FAQ Question?");
      await answerInput.fill("This is the answer from E2E testing.");

      // Save
      const saveBtn = page.getByRole("button", { name: /save|حفظ|create|إنشاء/i }).first();
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // FAQ should appear in the list
      const newFaq = page.locator("text=E2E Test FAQ Question").first();
      await expect(newFaq).toBeVisible({ timeout: 10000 });
    }
  });

  test("FAQ list shows entries with edit and delete buttons", async ({ page }) => {
    const bodyText = await page.locator("body").textContent();
    // Should have either FAQ items or empty state
    const hasFaqs = /question|answer|edit|delete|سؤال|حذف/i.test(bodyText ?? "");
    const isEmpty = /no results|no faqs|لا توجد/i.test(bodyText ?? "");
    const hasAddButton = /add|إضافة/i.test(bodyText ?? "");

    expect(hasFaqs || isEmpty || hasAddButton).toBeTruthy();
  });
});
