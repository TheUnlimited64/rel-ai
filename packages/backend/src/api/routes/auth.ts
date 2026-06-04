import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  validatePassword,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  getSessionCookieName,
} from "../../core/auth/session.js";

const COOKIE_NAME = getSessionCookieName();

export function createAuthRoutes(): Hono {
  const app = new Hono();

  app.post("/login", async (c) => {
    const body: { password?: unknown } | null = await c.req.json<{ password?: unknown }>().catch(() => null);
    if (!body || typeof body.password !== "string") {
      return c.json({ error: "Password is required" }, 400);
    }

    const valid = await validatePassword(body.password);
    if (!valid) {
      return c.json({ error: "Invalid password" }, 401);
    }

    const token = await createSessionToken();
    const opts = sessionCookieOptions();
    setCookie(c, COOKIE_NAME, token, opts);

    return c.json({ authenticated: true });
  });

  app.post("/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/me", async (c) => {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) {
      return c.json({ authenticated: false }, 401);
    }

    const valid = await verifySessionToken(token);
    if (!valid) {
      deleteCookie(c, COOKIE_NAME, { path: "/" });
      return c.json({ authenticated: false }, 401);
    }

    return c.json({ authenticated: true });
  });

  return app;
}
