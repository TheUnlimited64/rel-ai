import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import {
  createRealModel,
  createVirtualFallbackModel,
  createVirtualTunedModel,
  listModels,
  getModel,
  updateModel,
  deleteModel,
  testResolution,
} from "../../core/model/service.js";

const CreateRealModelInputSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  providerModel: z.string().min(1),
  displayName: z.string().optional(),
});

const CreateVirtualFallbackInputSchema = z.object({
  id: z.string().min(1),
  fallbackChain: z.array(z.string().min(1)).min(1),
  displayName: z.string().optional(),
});

const CreateVirtualTunedInputSchema = z.object({
  id: z.string().min(1),
  baseModelId: z.string().min(1),
  overrides: z.record(z.string(), z.unknown()).optional(),
  displayName: z.string().optional(),
});

const GetModelInputSchema = z.object({
  id: z.string().min(1),
});

const DeleteModelInputSchema = z.object({
  id: z.string().min(1),
});

const UpdateModelInputSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().optional(),
  providerModel: z.string().optional(),
  fallbackChain: z.array(z.string().min(1)).optional(),
  baseModelId: z.string().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
});

const TestResolutionInputSchema = z.object({
  id: z.string().min(1),
});

export const modelsRouter = createTRPCRouter({
  createReal: protectedProcedure
    .input(CreateRealModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createRealModel(ctx.db, input);
    }),

  createVirtualFallback: protectedProcedure
    .input(CreateVirtualFallbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createVirtualFallbackModel(ctx.db, input);
    }),

  createVirtualTuned: protectedProcedure
    .input(CreateVirtualTunedInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createVirtualTunedModel(ctx.db, input);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listModels(ctx.db);
  }),

  get: protectedProcedure
    .input(GetModelInputSchema)
    .query(async ({ ctx, input }) => {
      return getModel(ctx.db, input.id);
    }),

  update: protectedProcedure
    .input(UpdateModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return updateModel(ctx.db, input);
    }),

  delete: protectedProcedure
    .input(DeleteModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteModel(ctx.db, input.id);
    }),

  testResolution: protectedProcedure
    .input(TestResolutionInputSchema)
    .mutation(async ({ ctx, input }) => {
      return testResolution(ctx.db, input.id);
    }),
});
