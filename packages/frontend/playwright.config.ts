import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, "tests/e2e/.auth/user.json");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3999",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        storageState: undefined,
      },
    },
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: {
        storageState: undefined,
      },
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /auth\.spec\.ts/],
      use: {
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: "bun run ../backend/src/test-server.ts",
    url: 'http://localhost:3999/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
