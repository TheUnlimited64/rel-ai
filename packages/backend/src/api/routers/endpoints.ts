import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import {
  createEndpoint,
  listEndpoints,
  getEndpoint,
  updateEndpoint,
  deleteEndpoint,
  regenerateEndpointToken,
  getEndpointModels,
} from "../../core/endpoint/service.js";

async function mapNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
    }
    throw e;
  }
}

const PathSchema = z.string().regex(/^[a-z0-9-]+$/, "Path must be lowercase alphanumeric with hyphens");

const CreateEndpointInputSchema = z.object({
  name: z.string().min(1),
  path: PathSchema,
  modelIds: z.array(z.string()).default([]),
});

const UpdateEndpointInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  path: PathSchema.optional(),
  enabled: z.boolean().optional(),
  modelIds: z.array(z.string()).optional(),
});

const IdInputSchema = z.object({
  id: z.string().min(1),
});

export const endpointsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateEndpointInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createEndpoint(ctx.db, input);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listEndpoints(ctx.db);
  }),

  get: protectedProcedure
    .input(IdInputSchema)
    .query(async ({ ctx, input }) => {
      return mapNotFound(() => getEndpoint(ctx.db, input.id));
    }),

  update: protectedProcedure
    .input(UpdateEndpointInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => updateEndpoint(ctx.db, input));
    }),

  delete: protectedProcedure
    .input(IdInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => deleteEndpoint(ctx.db, input.id));
    }),

  regenerateToken: protectedProcedure
    .input(IdInputSchema)
    .mutation(async ({ ctx, input }) => {
      return mapNotFound(() => regenerateEndpointToken(ctx.db, input.id));
    }),

  getModels: protectedProcedure
    .input(IdInputSchema)
    .query(async ({ ctx, input }) => {
      return mapNotFound(() => getEndpointModels(ctx.db, input.id));
    }),
});
