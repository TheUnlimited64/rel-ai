import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { AdapterTypeSchema } from "@rel-ai/shared";
import {
  createProvider,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection,
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
      return getProvider(ctx.db, input.id);
    }),

  update: protectedProcedure
    .input(UpdateProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return updateProvider(ctx.db, input);
    }),

  delete: protectedProcedure
    .input(DeleteProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteProvider(ctx.db, input.id);
    }),

  testConnection: protectedProcedure
    .input(TestConnectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      return testProviderConnection(ctx.db, input.id);
    }),
});
