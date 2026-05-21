import { test, expect } from "@playwright/test";

test.describe("Full setup flow", () => {
  test("create provider, models, endpoint, and test resolution", async ({ page }) => {
    const u = Math.random().toString(36).slice(2, 6);

    // --- Step 1: Create a provider ---
    await test.step("Create provider", async () => {
      await page.goto("/providers");
      await page.getByRole("button", { name: /add provider/i }).click();

      await page.locator("#name").fill(`p${u}`);

      await page.locator('[role="dialog"] [role="combobox"]').click();
      await page.getByRole("option", { name: /custom/i }).click();

      await page.locator("#baseUrl").fill("http://localhost:4000/v1");
      await page.locator("#apiKey").fill("key");
      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      // Dismiss API key dialog via "Done" button
      const doneBtn = page.getByRole("button", { name: /^done$/i });
      await expect(doneBtn).toBeVisible({ timeout: 10000 });
      await doneBtn.click();
    });

    // --- Step 2: Create a real model ---
    await test.step("Create real model", async () => {
      await page.goto("/models");
      await page.getByRole("button", { name: /add real model/i }).click();

      await page.locator("#real-id").fill(`rm${u}`);
      await page.locator("#real-display").fill("Real");

      await page.locator('[role="dialog"] [role="combobox"]').click();
      await page.getByRole("option").first().click();

      await page.locator("#real-provider-model").fill("gpt-4");
      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      await page.goto("/models");
      await expect(page.getByRole("cell", { name: `rm${u}` })).toBeVisible({ timeout: 10000 });
    });

    // --- Step 3: Create a virtual fallback model ---
    await test.step("Create fallback model", async () => {
      await page.goto("/models");
      await page.getByRole("button", { name: /add virtual model/i }).click();
      await page.locator('[role="dialog"] button', { hasText: /^fallback$/i }).click();

      await page.locator("#vmodel-id").fill(`fb${u}`);
      await page.locator("#vmodel-display").fill("Fallback");

      await page.locator('input[placeholder="Model ID"]').fill(`rm${u}`);
      await page.locator('[role="dialog"] button', { hasText: /^add$/i }).click();

      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      await page.goto("/models");
      await expect(page.getByRole("cell", { name: `fb${u}` })).toBeVisible({ timeout: 10000 });
    });

    // --- Step 4: Create a virtual tuned model ---
    await test.step("Create tuned model", async () => {
      await page.goto("/models");
      await page.getByRole("button", { name: /add virtual model/i }).click();
      await page.locator('[role="dialog"] button', { hasText: /^tuned$/i }).click();

      await page.locator("#vmodel-id").fill(`tn${u}`);
      await page.locator("#vmodel-display").fill("Tuned");

      // Select base model — click combobox then pick first option
      await page.locator('[role="dialog"] [role="combobox"]').click();
      // The select options are rendered in a portal, just pick first one
      await page.getByRole("option", { name: /Real/i }).first().click();

      const textarea = page.locator('[role="dialog"] textarea');
      await expect(textarea).toBeVisible();
      await textarea.fill('{"temperature": 0.7}');

      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      await page.goto("/models");
      await expect(page.getByRole("cell", { name: `tn${u}` })).toBeVisible({ timeout: 10000 });
    });

    // --- Step 5: Create an endpoint ---
    await test.step("Create endpoint", async () => {
      await page.goto("/endpoints");
      await page.getByRole("button", { name: /add endpoint/i }).click();

      await page.locator("#ep-name").fill(`ep${u}`);
      await page.locator("#ep-path").fill(`ep${u}`);

      const cbs = page.locator('[role="dialog"] input[type="checkbox"]');
      for (let i = 0; i < await cbs.count(); i++) {
        await cbs.nth(i).check();
      }

      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      // Close token dialog via "Done" button
      const doneBtn = page.getByRole("button", { name: /^done$/i });
      await expect(doneBtn).toBeVisible({ timeout: 10000 });
      await doneBtn.click({ force: true });
    });

    // --- Step 6: Test model resolution ---
    await test.step("Test resolution", async () => {
      await page.goto(`/models/rm${u}`);
      await expect(page.locator("h1.text-2xl")).toBeVisible({ timeout: 10000 });

      await page.getByRole("button", { name: /test resolution/i }).click();
      await expect(page.locator("text=Resolution Chain")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=gpt-4").first()).toBeVisible();
    });
  });
});
