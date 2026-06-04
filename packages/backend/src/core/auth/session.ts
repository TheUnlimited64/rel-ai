/**
 * Password-based session auth for admin UI.
 * Uses HMAC-signed httpOnly cookies — stateless, no session store needed
 * for single-admin homelab use case.
 */

const COOKIE_NAME = "rel_ai_session";

/**
 * Get admin password from env. Required in production, defaults to "admin"
 * (with warning) in dev mode.
 */
export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[rel-ai] ADMIN_PASSWORD must be set in production. " +
          "Set the ADMIN_PASSWORD env var before starting the server.",
      );
    }
    console.warn(
      "[rel-ai] WARNING: ADMIN_PASSWORD not set, using default 'admin'. " +
        "Set ADMIN_PASSWORD env var for security.",
    );
    return "admin";
  }
  return password;
}

/**
 * Get or derive an HMAC signing key from the admin password + a secret.
 * Uses ENCRYPTION_KEY if available, otherwise derives from password itself.
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_KEY ?? getAdminPassword();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyMaterial;
}

/**
 * Create a signed session token. The token is `timestamp.hmac` where
 * timestamp is the login time (ISO string, URL-safe base64) and hmac
 * is the signature over it.
 */
export async function createSessionToken(): Promise<string> {
  const key = await getSigningKey();
  const timestamp = new Date().toISOString();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(timestamp),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const tsB64 = btoa(timestamp)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${tsB64}.${sigB64}`;
}

/**
 * Verify a session token. Returns true if the HMAC signature is valid.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const tsB64 = token.slice(0, dotIndex);
  const sigB64 = token.slice(dotIndex + 1);

  let timestamp: string;
  try {
    timestamp = atob(tsB64.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return false;
  }

  // Reject sessions older than 7 days
  const loginTime = new Date(timestamp);
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  if (Date.now() - loginTime.getTime() > maxAge) return false;

  const key = await getSigningKey();
  const encoder = new TextEncoder();

  // Convert base64url signature back to ArrayBuffer for verification
  let sigBytes: Uint8Array;
  try {
    const binaryStr = atob(sigB64.replace(/-/g, "+").replace(/_/g, "/"));
    sigBytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as BufferSource,
    encoder.encode(timestamp),
  );
}

/**
 * Validate a password against the admin password.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function validatePassword(password: string): Promise<boolean> {
  const adminPassword = getAdminPassword();
  const encoder = new TextEncoder();
  const a = encoder.encode(password);
  const b = encoder.encode(adminPassword);

  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length via timing
    await crypto.subtle.digest("SHA-256", a);
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

/**
 * Cookie options for the session cookie.
 *
 * ⚠️ HTTP deployments: in production (NODE_ENV=production) the session cookie
 * is set with `Secure: true` by default. Browsers silently drop Secure cookies
 * on plain HTTP connections, so every request after login appears unauthenticated
 * ("UNAUTHORIZED" errors in the dashboard).
 *
 * Fix: set `COOKIE_SECURE=false` in the environment when serving over HTTP:
 *   - Docker: add `- COOKIE_SECURE=false` under `environment:` in docker-compose.yml
 *   - Direct: `export COOKIE_SECURE=false` before starting the server
 *
 * Only disable this when behind a trusted reverse proxy that handles TLS
 * termination, or in a private network where HTTPS is unavailable.
 */
export function sessionCookieOptions() {
  const secureOverride = process.env.COOKIE_SECURE;
  const secure = secureOverride !== undefined
    ? secureOverride === "true"
    : process.env.NODE_ENV === "production";

  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}

/** Get session cookie name */
export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
