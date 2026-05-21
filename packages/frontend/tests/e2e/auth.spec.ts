import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("login with valid token redirects to providers", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="password"], input[placeholder="Bearer token"]').fill("e2e-test-token-12345");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/providers/);
    await expect(page).toHaveURL(/\/providers/);

    const token = await page.evaluate(() => localStorage.getItem("rel_ai_token"));
    expect(token).toBe("e2e-test-token-12345");
  });

  test("login with invalid token shows error", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="password"], input[placeholder="Bearer token"]').fill("invalid-token");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.locator("text=Invalid token")).toBeVisible();
  });
});
