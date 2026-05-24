import { test, expect } from "@playwright/test";

test.describe("Log dashboard", () => {
  test("logs page renders with stats and entries", async ({ page }) => {
    await page.goto("/logs", { waitUntil: "load", timeout: 15000 });

    await expect(page.getByRole("heading", { name: /request logs/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Total Requests").first()).toBeVisible();
    await expect(page.getByText("Success Rate").first()).toBeVisible();
    await expect(page.getByText("Avg Latency").first()).toBeVisible();
    await expect(page.getByText("Total Tokens").first()).toBeVisible();

    await expect(page.getByText("Date Range").first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /endpoint/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /provider$/i })).toBeVisible();

    await expect(page.getByText("Requests").first()).toBeVisible();

    await expect(page.getByText("gpt-4").first()).toBeVisible();
    await expect(page.getByText("claude-3").first()).toBeVisible();
  });

  test("log filters can be interacted with", async ({ page }) => {
    await page.goto("/logs", { waitUntil: "load", timeout: 15000 });

    await expect(page.getByRole("heading", { name: /request logs/i })).toBeVisible({ timeout: 10000 });

    const triggers = page.locator('[role="combobox"]');
    await expect(triggers.first()).toBeVisible({ timeout: 5000 });
    const count = await triggers.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await triggers.first().click();
    await expect(page.getByRole("option", { name: /24 hours/i })).toBeVisible();
    await page.getByRole("option", { name: /24 hours/i }).click();

    await triggers.nth(1).click();
    await expect(page.getByRole("option", { name: /success/i })).toBeVisible();
    await page.getByRole("option", { name: /success/i }).click();
  });
});
