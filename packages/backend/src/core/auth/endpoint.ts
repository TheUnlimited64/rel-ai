import { endpoints } from "../../db/schema/endpoints.js";
import type { DbClient } from "../../db/connection.js";
import { eq, and } from "drizzle-orm";
import { hashToken } from "./token.js";

/**
 * Validate a bearer token for a proxy endpoint.
 * Each endpoint has its own token; look up by path + tokenHash.
 */
export async function validateEndpointToken(
  db: DbClient,
  path: string,
  token: string,
): Promise<typeof endpoints.$inferSelect | null> {
  const hash = await hashToken(token);
  const row = db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.path, path), eq(endpoints.tokenHash, hash)))
    .get();
  if (!row) return null;
  if (!row.enabled) return null;
  return row;
}
