import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { AdapterTypeSchema } from "@rel-ai/shared";
import {
  createProvider,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection,
  regenerateApiKey,
} from "../../core/provider/service.js";

const CreateProviderInputSchema = z.object({
  name: z.string().min(1),
  adapterType: AdapterTypeSchema,
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const UpdateProviderInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  adapterType: AdapterTypeSchema.optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const GetProviderInputSchema = z.object({
  id: z.string().min(1),
});

const DeleteProviderInputSchema = z.object({
  id: z.string().min(1),
});

const TestConnectionInputSchema = z.object({
  id: z.string().min(1),
});

async function mapNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
    }
    throw e;
  }
}

export const providersRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createProvider(ctx.db, input);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listProviders(ctx.db);
  }),

  get: protectedProcedure
    .input(GetProviderInputSchema)
    .query(async ({ ctx, input }) => {
      return mapNotFound(() => getProvider(ctx.db, input.id));
    }),

  update: protectedProcedure
    .input(UpdateProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => updateProvider(ctx.db, input));
    }),

  delete: protectedProcedure
    .input(DeleteProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => deleteProvider(ctx.db, input.id));
    }),

  testConnection: protectedProcedure
    .input(TestConnectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => testProviderConnection(ctx.db, input.id, ctx.registry));
    }),

  regenerateApiKey: protectedProcedure
    .input(GetProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => regenerateApiKey(ctx.db, input.id));
    }),
});
