import { authTokens } from "../../db/schema/auth_tokens.js";
import type { DbClient } from "../../db/connection.js";
import { eq } from "drizzle-orm";

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
