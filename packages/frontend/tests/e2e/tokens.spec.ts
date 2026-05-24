import { test, expect } from "@playwright/test";

const uid = Date.now().toString(36).slice(-5);

test.describe("Tokens page", () => {
  test("list page renders with existing tokens", async ({ page }) => {
    await page.goto("/tokens");
    await expect(page.getByRole("heading", { name: /auth tokens/i })).toBeVisible();
    // The seeded admin token should be visible
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("create token via UI", async ({ page }) => {
    const tokenName = `tk${uid}`;

    await page.goto("/tokens");

    // Click "Create Token" button
    await page.getByRole("button", { name: /create token/i }).click();

    // Fill name in dialog
    await page.locator("#token-name").fill(tokenName);

    // Submit
    await page.getByRole("dialog").getByRole("button", { name: /^create$/i }).click();

    // Token reveal dialog should appear
    await expect(page.getByRole("heading", { name: "Token Created" })).toBeVisible({ timeout: 10000 });

    // Token value should be shown (non-empty code block)
    await expect(page.getByRole("dialog").locator("code")).not.toBeEmpty();

    // Dismiss
    await page.getByRole("dialog").getByRole("button", { name: /^done$/i }).click();

    // New token should appear in table
    await expect(page.getByRole("cell", { name: tokenName })).toBeVisible({ timeout: 10000 });
  });
});
