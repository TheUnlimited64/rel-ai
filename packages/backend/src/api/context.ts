import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context } from "hono";

export type tRPCContext = {
  authorized?: boolean;
  token?: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
  _c: Context,
): Promise<tRPCContext> {
  const authHeader = opts.req.headers.get("Authorization");
  if (!authHeader) return {};

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return {};

  return { authorized: true, token };
}
