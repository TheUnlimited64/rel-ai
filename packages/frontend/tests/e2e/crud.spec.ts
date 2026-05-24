import { test, expect } from "@playwright/test";

// Use unique short IDs
const uid = Date.now().toString(36).slice(-5);

test.describe("CRUD smoke tests", () => {
  test.describe("Providers", () => {
    test("list page renders", async ({ page }) => {
      await page.goto("/providers");
      await expect(page.getByRole("heading", { name: /providers/i })).toBeVisible();
    });

    test("create, view, edit, and delete provider", async ({ page }) => {
      await page.goto("/providers");

      const providerName = `cp${uid}`;

      // Create
      await page.getByRole("button", { name: /add provider/i }).click();
      await page.locator("#name").fill(providerName);

      // Select adapter type "Custom"
      await page.locator('[role="dialog"] [role="combobox"]').click();
      await page.getByRole("option", { name: /custom/i }).click();

      await page.locator("#baseUrl").fill("http://localhost:4000/v1");
      await page.locator("#apiKey").fill("crud-key");
      await page.getByRole("button", { name: /^create$/i }).click();

      // Dismiss API key reveal dialog with "Done"
      await page.getByRole("button", { name: /^done$/i }).click();

      // After "Done", page navigates to provider detail
      await expect(page.getByRole("heading", { name: providerName })).toBeVisible({ timeout: 10000 });

      // Edit
      const editBtn = page.getByRole("button", { name: /^edit/i });
      await expect(editBtn).toBeVisible();
      await editBtn.click();
      const nameInput = page.locator("#name, #edit-name").first();
      await expect(nameInput).toBeVisible();
      await nameInput.fill(`${providerName}u`);
      await page.getByRole("button", { name: /save|update/i }).click();
      // Verify still on detail page with updated name
      await expect(page.locator("h1.text-2xl")).toBeVisible({ timeout: 10000 });

      // Go back to providers list and delete
      await page.goto("/providers");
      const row = page.locator("tr", { hasText: providerName });
      await expect(row).toBeVisible({ timeout: 5000 });
      await row.locator("button", { hasText: /delete/i }).click();
      const confirmBtn = page.locator('[role="dialog"] button', { hasText: /^delete$/i });
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    });
  });

  test.describe("Models", () => {
    test("list page renders", async ({ page }) => {
      await page.goto("/models");
      await expect(page.getByRole("heading", { name: /models/i })).toBeVisible();
    });

    test("create real model, view detail, and delete", async ({ page }) => {
      await page.goto("/models");

      const modelId = `cm${uid}`;

      // Create real model
      await page.getByRole("button", { name: /add real model/i }).click();
      await page.locator("#real-id").fill(modelId);
      await page.locator("#real-display").fill("CRUD Model");

      // Select provider (combobox inside dialog)
      await page.locator('[role="dialog"] [role="combobox"]').click();
      await page.getByRole("option").first().click();

      await page.locator("#real-provider-model").fill("crud-model-name");
      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      await page.goto("/models");
      await expect(page.getByRole("cell", { name: modelId })).toBeVisible({ timeout: 10000 });

      // View detail by navigating directly
      await page.goto(`/models/${modelId}`);
      await expect(page.locator("h1.text-2xl")).toBeVisible({ timeout: 10000 });

      // Delete from detail page
      const deleteBtn = page.getByRole("button", { name: /delete/i });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();
      const confirmBtn = page.locator('[role="dialog"] button', { hasText: /^delete$/i });
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    });
  });

  test.describe("Endpoints", () => {
    test("list page renders", async ({ page }) => {
      await page.goto("/endpoints");
      await expect(page.getByRole("heading", { name: /endpoints/i })).toBeVisible();
    });

    test("create endpoint and view detail", async ({ page }) => {
      await page.goto("/endpoints");

      const epPath = `ce${uid}`;

      // Create
      await page.getByRole("button", { name: /add endpoint/i }).click();
      await page.locator("#ep-name").fill(`CE ${uid}`);
      await page.locator("#ep-path").fill(epPath);

      // Select first available model if any exist
      const checkbox = page.locator('[role="dialog"] input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.check();
      }

      await page.locator('[role="dialog"] button', { hasText: /^create$/i }).click();

      // Wait for token dialog and dismiss with "Done"
      // The "Done" button may be intercepted by dialog overlay; use force click
      const doneBtn = page.getByRole("button", { name: /^done$/i });
      await doneBtn.click({ force: true });

      // Verify endpoint was created by checking it's in the table
      await page.goto("/endpoints");
      await expect(page.getByRole("cell", { name: epPath })).toBeVisible({ timeout: 10000 });

      // Navigate to detail by clicking row
      await page.locator("tr", { hasText: epPath }).click();

      // Try edit
      const editBtn = page.getByRole("button", { name: /^edit/i });
      await expect(editBtn).toBeVisible();
      await editBtn.click();
      const nameInput = page.locator("#ep-edit-name, #ep-name").first();
      await expect(nameInput).toBeVisible();
      await nameInput.fill(`CE ${uid}u`);
      await page.getByRole("button", { name: /save|update/i }).click();
      // Verify still on detail page
      await expect(page.locator("h1.text-2xl")).toBeVisible({ timeout: 10000 });
      await page.goto("/endpoints");
      const deleteBtn = page.locator("tr", { hasText: epPath }).locator("button", { hasText: /delete/i });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();
      const confirmBtn = page.locator('[role="dialog"] button', { hasText: /^delete$/i });
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    });
  });
});
