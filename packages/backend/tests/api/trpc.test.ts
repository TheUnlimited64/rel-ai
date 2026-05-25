import { describe, test, expect, beforeAll } from "bun:test";
import { initializeApp } from "../../src/index.js";
import { createSessionToken } from "../../src/core/auth/session.js";

const BASE = "http://localhost";
let app: ReturnType<typeof initializeApp>["app"];

beforeAll(() => {
  ({ app } = initializeApp());
});

describe("tRPC API", () => {
  test("protected procedure blocks unauthenticated request", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
  });

  test("protected procedure rejects invalid session cookie", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
      headers: { Cookie: "rel_ai_session=invalid-token" },
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
  });

  test("protected procedure accepts valid session cookie", async () => {
    const token = await createSessionToken();
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
      headers: { Cookie: `rel_ai_session=${token}` },
    });
    expect(res.status).toBe(200);
  });

  test("error formatter doesn't leak stack traces", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
    });
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.stack).toBeUndefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
    expect(json.error.data.code).toBe("INTERNAL_SERVER_ERROR");
  });

  test("unknown procedure returns NOT_FOUND", async () => {
    const res = await app.request(`${BASE}/api/trpc/auth.list`, {
      method: "GET",
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.data.code).toBe("NOT_FOUND");
  });

  test("auth.createToken requires authentication", async () => {
    const res = await app.request(`${BASE}/api/trpc/auth.createToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
  });
});
