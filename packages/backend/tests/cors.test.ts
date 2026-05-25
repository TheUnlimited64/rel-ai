import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createApp } from "../src/server.js";
import { createMemoryDb } from "../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const BASE = "http://localhost";

function buildApp() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return createApp(db);
}

describe("CORS middleware", () => {
  const originalEnv = process.env.CORS_ORIGINS;

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CORS_ORIGINS = originalEnv;
    } else {
      delete process.env.CORS_ORIGINS;
    }
  });

  describe("proxy routes /v1/*", () => {
    test("OPTIONS preflight returns CORS headers with wildcard origin", async () => {
      const app = buildApp();
      const res = await app.request(`${BASE}/v1/chat/completions`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://external-app.example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type,Authorization",
        },
      });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
    });

    test("GET with Origin header returns CORS headers", async () => {
      const app = buildApp();
      const res = await app.request(`${BASE}/v1/models`, {
        method: "GET",
        headers: { Origin: "https://consumer-app.example.com" },
      });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("admin routes /api/trpc/*", () => {
    test("rejects cross-origin request when CORS_ORIGINS is not set", async () => {
      const app = buildApp();
      const res = await app.request(`${BASE}/api/trpc/providers.list`, {
        method: "GET",
        headers: { Origin: "https://evil.example.com" },
      });
      const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
      expect(allowOrigin === null || allowOrigin === "").toBe(true);
    });

    test("allows request from allowed origin when CORS_ORIGINS is set", async () => {
      process.env.CORS_ORIGINS = "https://admin.example.com,https://dashboard.example.com";
      const app = buildApp();
      const res = await app.request(`${BASE}/api/trpc/providers.list`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://admin.example.com",
          "Access-Control-Request-Method": "POST",
        },
      });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://admin.example.com");
    });

    test("rejects request from disallowed origin when CORS_ORIGINS is set", async () => {
      process.env.CORS_ORIGINS = "https://admin.example.com";
      const app = buildApp();
      const res = await app.request(`${BASE}/api/trpc/providers.list`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example.com",
          "Access-Control-Request-Method": "POST",
        },
      });
      const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
      expect(allowOrigin === null || allowOrigin === "").toBe(true);
    });

    test("allows same-origin request without Origin header", async () => {
      const app = buildApp();
      const res = await app.request(`${BASE}/api/trpc/providers.list`, {
        method: "GET",
      });
      expect(res.status).not.toBe(403);
    });
  });
});
