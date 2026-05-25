import { describe, test, expect, beforeEach } from "bun:test";
import { initializeApp } from "../../src/index.js";
import { createSessionToken, verifySessionToken, validatePassword, getAdminPassword } from "../../src/core/auth/session.js";

const BASE = "http://localhost";

describe("Session auth routes", () => {
  let app: ReturnType<typeof initializeApp>["app"];

  beforeEach(() => {
    ({ app } = initializeApp());
  });

  test("POST /api/auth/login — valid password sets cookie", async () => {
    const res = await app.request(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "admin" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("rel_ai_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  test("POST /api/auth/login — invalid password returns 401", async () => {
    const res = await app.request(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid password");
  });

  test("POST /api/auth/login — missing body returns 400", async () => {
    const res = await app.request(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("GET /api/auth/me — valid session returns authenticated", async () => {
    const loginRes = await app.request(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "admin" }),
    });
    const setCookie = loginRes.headers.get("Set-Cookie")!;
    const cookieMatch = setCookie.match(/rel_ai_session=([^;]+)/);
    const cookie = cookieMatch![1];

    const meRes = await app.request(`${BASE}/api/auth/me`, {
      headers: { Cookie: `rel_ai_session=${cookie}` },
    });
    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.authenticated).toBe(true);
  });

  test("GET /api/auth/me — no cookie returns 401", async () => {
    const res = await app.request(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  test("GET /api/auth/me — invalid cookie returns 401", async () => {
    const res = await app.request(`${BASE}/api/auth/me`, {
      headers: { Cookie: "rel_ai_session=garbage" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  test("POST /api/auth/logout — clears cookie", async () => {
    const loginRes = await app.request(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "admin" }),
    });
    const setCookie = loginRes.headers.get("Set-Cookie")!;
    const cookieMatch = setCookie.match(/rel_ai_session=([^;]+)/);
    const cookie = cookieMatch![1];

    const logoutRes = await app.request(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `rel_ai_session=${cookie}` },
    });
    expect(logoutRes.status).toBe(200);

    const deleteCookieHeader = logoutRes.headers.get("Set-Cookie");
    expect(deleteCookieHeader).toContain("rel_ai_session=");
    expect(deleteCookieHeader).toContain("Max-Age=0");
  });
});

describe("Session token utilities", () => {
  test("createSessionToken produces verifiable token", async () => {
    const token = await createSessionToken();
    expect(token).toContain(".");
    const valid = await verifySessionToken(token);
    expect(valid).toBe(true);
  });

  test("verifySessionToken rejects garbage", async () => {
    const valid = await verifySessionToken("not-a-token");
    expect(valid).toBe(false);
  });

  test("verifySessionToken rejects empty string", async () => {
    const valid = await verifySessionToken("");
    expect(valid).toBe(false);
  });

  test("validatePassword accepts correct password", async () => {
    const valid = await validatePassword("admin");
    expect(valid).toBe(true);
  });

  test("validatePassword rejects wrong password", async () => {
    const valid = await validatePassword("wrong");
    expect(valid).toBe(false);
  });

  test("getAdminPassword returns default in dev", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const pw = getAdminPassword();
    expect(pw).toBe("admin");
    process.env.NODE_ENV = original;
  });

  test("getAdminPassword throws in production without env var", () => {
    const originalNode = process.env.NODE_ENV;
    const originalPw = process.env.ADMIN_PASSWORD;
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_PASSWORD;
    expect(() => getAdminPassword()).toThrow("ADMIN_PASSWORD must be set in production");
    process.env.NODE_ENV = originalNode;
    if (originalPw) process.env.ADMIN_PASSWORD = originalPw;
  });
});
