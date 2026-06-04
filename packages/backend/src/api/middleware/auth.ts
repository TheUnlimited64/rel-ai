import type { tRPCContext } from "../context.js";

// tRPC middleware requires a generic signature; the any types are unavoidable here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authMiddleware = <T extends { ctx: tRPCContext; next: (...args: any[]) => any }>(
  opts: T,
) => {
  if (!opts.ctx.authorized) {
    throw new Error("UNAUTHORIZED");
  }
  return opts.next({ ctx: { ...opts.ctx, authorized: true } }) as ReturnType<T["next"]>;
};
