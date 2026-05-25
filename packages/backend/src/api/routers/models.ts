import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  HasDependentsError,
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

function mapServiceError<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    if (e instanceof Error) {
      const msg = e.message;
      if (
        msg === "NOT_FOUND" ||
        msg.startsWith("MODEL_NOT_FOUND") ||
        msg === "PROVIDER_NOT_FOUND" ||
        msg === "BASE_MODEL_NOT_FOUND"
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: msg });
      }
      if (msg === "DUPLICATE_ID") {
        throw new TRPCError({ code: "CONFLICT", message: msg });
      }
      if (msg === "CIRCULAR_DEPENDENCY") {
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
      if (msg === "INVALID_BASE_MODEL") {
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
      if (e instanceof HasDependentsError) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "HAS_DEPENDENTS",
          data: { dependents: e.dependents },
        });
      }
    }
    throw e;
  }
}

export const modelsRouter = createTRPCRouter({
  createReal: protectedProcedure
    .input(CreateRealModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => createRealModel(ctx.db, input));
    }),

  createVirtualFallback: protectedProcedure
    .input(CreateVirtualFallbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => createVirtualFallbackModel(ctx.db, input));
    }),

  createVirtualTuned: protectedProcedure
    .input(CreateVirtualTunedInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => createVirtualTunedModel(ctx.db, input));
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listModels(ctx.db);
  }),

  get: protectedProcedure
    .input(GetModelInputSchema)
    .query(async ({ ctx, input }) => {
      return mapServiceError(() => getModel(ctx.db, input.id));
    }),

  update: protectedProcedure
    .input(UpdateModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => updateModel(ctx.db, input));
    }),

  delete: protectedProcedure
    .input(DeleteModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => deleteModel(ctx.db, input.id));
    }),

  testResolution: protectedProcedure
    .input(TestResolutionInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapServiceError(() => testResolution(ctx.db, input.id));
    }),
});
