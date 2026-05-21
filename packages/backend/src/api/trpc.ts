import { initTRPC } from "@trpc/server";
import type { tRPCContext } from "./context.js";
import { authMiddleware } from "./middleware/auth.js";

const t = initTRPC.context<tRPCContext>().create({
  errorFormatter({ shape }) {
    return {
      message: shape.message,
      code: shape.data.code,
    };
  },
});

const loggingMiddleware = t.middleware(async ({ path, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[tRPC] ${path} - ${duration}ms`);
  return result;
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(loggingMiddleware);

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(t.middleware(authMiddleware));

export type AppRouter = typeof import("./router.js").appRouter;
