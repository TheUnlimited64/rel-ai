import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authTokens } from "../../db/schema/auth_tokens.js";
import { generateToken, hashToken } from "../../core/auth/token.js";
import { checkFirstRun } from "../../core/auth/first-run.js";
import { eq } from "drizzle-orm";

export const authRouter = createTRPCRouter({
  isFirstRun: protectedProcedure.query(({ ctx }) => {
    return { isFirstRun: checkFirstRun(ctx.db) };
  }),

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
    return ctx.db.select({
      id: authTokens.id,
      name: authTokens.name,
      createdAt: authTokens.createdAt,
      lastUsedAt: authTokens.lastUsedAt,
    }).from(authTokens).all();
  }),

  deleteToken: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const existing = ctx.db.select({ id: authTokens.id }).from(authTokens).where(eq(authTokens.id, input.id)).get();
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      }
      ctx.db.delete(authTokens).where(eq(authTokens.id, input.id)).run();
      return { success: true };
    }),

  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hash = await hashToken(input.token);
      const row = ctx.db.select({ id: authTokens.id }).from(authTokens).where(eq(authTokens.tokenHash, hash)).get();
      if (!row) {
        return { valid: false };
      }
      ctx.db.update(authTokens)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(authTokens.id, row.id))
        .run();
      return { valid: true };
    }),
});
