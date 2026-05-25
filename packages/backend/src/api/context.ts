import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context } from "hono";
import type { DbClient } from "../db/connection.js";
import { validateToken, extractBearerToken } from "../core/auth/token.js";

export type tRPCContext = {
  authorized?: boolean;
  token?: string;
  db: DbClient;
};

/**
 * Create a context factory that closes over the DB instance.
 * The token is validated against the DB; only valid tokens set authorized=true.
 */
export function createContextFactory(db: DbClient) {
  return async function createContext(
    opts: FetchCreateContextFnOptions,
    _c: Context,
  ): Promise<tRPCContext> {
    const authHeader = opts.req.headers.get("Authorization");
    const token = extractBearerToken(authHeader);
    if (!token) return { db };

    const tokenRecord = await validateToken(db, token);
    if (!tokenRecord) return { db };

    return { authorized: true, token, db };
  };
}
