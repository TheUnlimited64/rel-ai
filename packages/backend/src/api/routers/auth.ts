import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { authTokens } from "../../db/schema/auth_tokens.js";
import { generateToken } from "../../core/auth/token.js";
import { eq } from "drizzle-orm";

export const authRouter = createTRPCRouter({
  createToken: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { token, hash } = await generateToken();
      const id = crypto.randomUUID();
      ctx.db.insert(authTokens).values({ id, name: input.name, tokenHash: hash }).run();
      // Token is only returned on creation; hash is stored, not plaintext
      return { id, name: input.name, token };
    }),

  listTokens: protectedProcedure.query(({ ctx }) => {
    return ctx.db.select().from(authTokens).all();
  }),

  deleteToken: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(authTokens).where(eq(authTokens.id, input.id)).run();
      return { success: true };
    }),
});
