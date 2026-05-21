import { describe, test, expect } from "bun:test";
import { app } from "../../src/index.js";

const BASE = "http://localhost";

describe("tRPC API", () => {
  test("public procedure works without auth header", async () => {
    const res = await app.request(`${BASE}/api/trpc/auth.list`, {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;
    expect(data).toEqual([]);
  });

  test("protected procedure blocks unauthenticated request", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
  });

  test("protected procedure works with Bearer token", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
      headers: { Authorization: "Bearer test-token-123" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;
    expect(data).toEqual([]);
  });

  test("error formatter doesn't leak stack traces", async () => {
    const res = await app.request(`${BASE}/api/trpc/providers.list`, {
      method: "GET",
    });
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.stack).toBeUndefined();
    expect(json.error.message).toBe("UNAUTHORIZED");
    expect(json.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  test("Zod input validation accepts valid input", async () => {
    const input = encodeURIComponent(JSON.stringify({ query: "test" }));
    const res = await app.request(
      `${BASE}/api/trpc/auth.search?input=${input}`,
      { method: "GET" },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;
    expect(data.matches).toEqual([]);
    expect(data.query).toBe("test");
  });

  test("Zod input validation rejects invalid input", async () => {
    const input = encodeURIComponent(JSON.stringify({ query: "" }));
    const res = await app.request(
      `${BASE}/api/trpc/auth.search?input=${input}`,
      { method: "GET" },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  test("Zod input validation rejects missing input", async () => {
    const res = await app.request(`${BASE}/api/trpc/auth.search`, {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("BAD_REQUEST");
  });
});
