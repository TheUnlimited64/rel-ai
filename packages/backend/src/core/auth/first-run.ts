import { count } from "drizzle-orm";
import type { DbClient } from "../../db/connection.js";
import { authTokens } from "../../db/schema/auth_tokens.js";
import { providers } from "../../db/schema/providers.js";

/**
 * Check if this is a first-run state (no auth tokens or no providers).
 * Extracted for testability.
 */
export function checkFirstRun(db: DbClient): boolean {
  const tokenRows = db.select({ count: count() }).from(authTokens).all();
  const providerRows = db.select({ count: count() }).from(providers).all();
  const tokenCount = tokenRows[0]?.count ?? 0;
  const providerCount = providerRows[0]?.count ?? 0;
  return tokenCount === 0 || providerCount === 0;
}
