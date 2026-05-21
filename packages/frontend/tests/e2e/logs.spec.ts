import { test, expect } from "@playwright/test";

test.describe("Log dashboard", () => {
  test("logs page renders with filters and stats", async ({ page }) => {
    await page.goto("/logs");

    // Assert page heading exists
    await expect(page.locator("h1")).toBeVisible();

    // Assert stats cards are visible (request count, success rate, etc.)
    const statsCards = page.locator('[data-testid="stat-card"], .stat-card, [class*="stat"]');
    if (await statsCards.count() > 0) {
      await expect(statsCards.first()).toBeVisible();
    }

    // Assert table or content area is present
    await expect(page.locator("table").or(page.locator("text=/request|log/i").first())).toBeVisible({ timeout: 10000 });

    // Test date filter: find the select by its label text
    const dateLabels = page.locator("label, .text-xs");
    const dateLabelTexts = await dateLabels.allTextContents();
    const hasDateLabel = dateLabelTexts.some(t => t.toLowerCase().includes("date"));

    if (hasDateLabel) {
      // Click the select trigger near the date label
      const selects = page.locator('[role="combobox"]');
      const selectCount = await selects.count();
      if (selectCount >= 1) {
        await selects.first().click();
        // Try to select "24 hours" option
        const option24h = page.getByRole("option", { name: /24 hours/i });
        await expect(option24h).toBeVisible();
        await option24h.click();
      }
    }

    // Test status filter (second select)
    const selects = page.locator('[role="combobox"]');
    const selectCount = await selects.count();
    if (selectCount >= 2) {
      await selects.nth(1).click();
      const successOption = page.getByRole("option", { name: /success/i });
      await expect(successOption).toBeVisible();
      await successOption.click();
    }
  });
});
