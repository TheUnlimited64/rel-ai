import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const endpointsRouter = createTRPCRouter({
  list: protectedProcedure.query(() => []),
});
