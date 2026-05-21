import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { z } from "zod";

export const authRouter = createTRPCRouter({
  list: publicProcedure.query(() => []),
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input }) => {
      return { matches: [], query: input.query };
    }),
});
