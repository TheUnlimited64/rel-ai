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
    await page.goto("/");
    // Fill in a bad token and submit
    const tokenInput = page.locator('input[type="password"], input[name="token"], input[placeholder*="token" i]');
    if (await tokenInput.count() > 0) {
      await tokenInput.first().fill("invalid-token-xxx");
      const submitBtn = page.getByRole("button", { name: /login|submit|sign in/i });
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        // Expect error feedback
        await expect(page.locator("text=/invalid|unauthorized|error|failed/i")).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
