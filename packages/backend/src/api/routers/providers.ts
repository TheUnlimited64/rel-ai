import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const providersRouter = createTRPCRouter({
  list: protectedProcedure.query(() => []),
});
