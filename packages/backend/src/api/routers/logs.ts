import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const logsRouter = createTRPCRouter({
  list: protectedProcedure.query(() => []),
});
