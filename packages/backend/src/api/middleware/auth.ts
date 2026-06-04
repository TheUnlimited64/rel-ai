import type { tRPCContext } from "../context.js";

export const authMiddleware = (opts: {
  ctx: tRPCContext;
  next: (opts: { ctx: tRPCContext & { authorized: true } }) => Promise<unknown>;
}) => {
  if (!opts.ctx.authorized) {
    throw new Error("UNAUTHORIZED");
  }
  return opts.next({ ctx: { ...opts.ctx, authorized: true as const } });
};
