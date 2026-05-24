import { test, expect } from "@playwright/test";

test.describe("Negative path tests", () => {
  test("invalid endpoint path returns 401 or error", async ({ request }) => {
    const response = await request.post("http://localhost:3999/v1/nonexistent-path/chat/completions", {
      headers: {
        "Authorization": "Bearer invalid-token",
        "Content-Type": "application/json",
      },
      data: {
        model: "nonexistent",
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    expect(response.status()).not.toBe(200);
  });

  test("login with invalid token shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("rel_ai_token"));
    await page.reload();

    await page.locator('input[type="password"]').fill("invalid-token-xxx", { timeout: 5000 });
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("text=/invalid|unauthorized|error|failed/i")).toBeVisible({ timeout: 5000 });
  });
});
