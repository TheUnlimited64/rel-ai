import type { DbClient } from "./db/connection.js";
import { hashToken } from "./core/auth/token.js";
import { authTokens } from "./db/schema/index.js";

/**
 * Seed a test admin token into the DB.
 * Returns the plaintext token for use in tests.
 */
export async function seedTestToken(db: DbClient, token: string): Promise<void> {
  const hash = await hashToken(token);
  db.insert(authTokens)
    .values({
      id: crypto.randomUUID(),
      name: "E2E Test Token",
      tokenHash: hash,
    })
    .onConflictDoNothing()
    .run();
}
