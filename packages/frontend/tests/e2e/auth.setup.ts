import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Fill token input
  await page.locator('input[type="password"]').fill("e2e-test-token-12345");

  // Click Sign In
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to providers page
  await page.waitForURL(/\/providers/);

  // Verify localStorage has token
  const token = await page.evaluate(() => localStorage.getItem("rel_ai_token"));
  expect(token).toBe("e2e-test-token-12345");

  // Save auth state for other tests
  await page.context().storageState({ path: AUTH_FILE });
});
