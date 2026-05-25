import { authTokens } from "../../db/schema/auth_tokens.js";
import type { DbClient } from "../../db/connection.js";
import { eq } from "drizzle-orm";

/**
 * Mask a token for safe logging. Shows first 3 and last 4 characters,
 * replacing the middle with "****". Tokens shorter than 8 chars show "****".
 */
export function maskToken(token: string): string {
  if (token.length <= 7) return "****";
  return token.slice(0, 3) + "****" + token.slice(-4);
}

/**
 * Generate a cryptographically secure random token and its SHA-256 hash.
 * Token is 32 bytes hex-encoded (64 chars).
 */
export async function generateToken(): Promise<{ token: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString("hex");
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Buffer.from(hashBuffer).toString("hex");
  return { token, hash };
}

/**
 * Hash a plaintext token using SHA-256.
 */
export async function hashToken(token: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Buffer.from(hashBuffer).toString("hex");
}

/**
 * Extract a Bearer token from an Authorization header value.
 * Returns null for missing, malformed, or empty-token headers.
 * Rejects double-space patterns like "Bearer  token" (strict single-space split).
 */
export function extractBearerToken(
  header: string | undefined | null,
): string | null {
  if (!header) return null;
  const match = /^Bearer (\S+)$/.exec(header);
  return match ? match[1] : null;
}

/**
 * Validate a token against the auth_tokens table.
 * Returns the token record if valid, null otherwise.
 * Updates lastUsedAt on successful validation.
 */
export async function validateToken(
  db: DbClient,
  token: string,
): Promise<typeof authTokens.$inferSelect | null> {
  const hash = await hashToken(token);
  return db.transaction(async (tx) => {
    const row = tx.select().from(authTokens).where(eq(authTokens.tokenHash, hash)).get();
    if (!row) return null;
    tx.update(authTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(authTokens.id, row.id))
      .run();
    return row;
  });
}
