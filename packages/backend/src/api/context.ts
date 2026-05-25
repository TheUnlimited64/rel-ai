import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context } from "hono";
import type { DbClient } from "../db/connection.js";
import type { AdapterRegistry } from "../core/provider/registry.js";
import { verifySessionToken, getSessionCookieName } from "../core/auth/session.js";

export type tRPCContext = {
  authorized?: boolean;
  db: DbClient;
  registry: AdapterRegistry;
};

export function createContextFactory(db: DbClient, registry: AdapterRegistry) {
  return async function createContext(
    opts: FetchCreateContextFnOptions,
    _c: Context,
  ): Promise<tRPCContext> {
    const cookieHeader = opts.req.headers.get("Cookie") ?? "";
    const cookieName = getSessionCookieName();
    const match = cookieHeader.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`));
    if (!match) return { db, registry };

    const token = match.slice(cookieName.length + 1);
    if (!token) return { db, registry };

    const valid = await verifySessionToken(token);
    if (!valid) return { db, registry };

    return { authorized: true, db, registry };
  };
}
