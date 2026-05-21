import type { tRPCContext } from "../context.js";

/**
 * Auth middleware for protected procedures.
 * Validates that the request has a valid bearer token.
 */
export const authMiddleware = <T extends { ctx: tRPCContext; next: (...args: any[]) => any }>(
  opts: T,
) => {
  if (!opts.ctx.authorized) {
    throw new Error("UNAUTHORIZED");
  }
  return opts.next({ ctx: { ...opts.ctx, authorized: true, token: opts.ctx.token! } });
};
