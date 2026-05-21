import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const modelsRouter = createTRPCRouter({
  list: protectedProcedure.query(() => []),
});
