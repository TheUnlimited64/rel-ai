import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { EndpointPathSchema } from "@rel-ai/shared";
import {
  createEndpoint,
  listEndpoints,
  getEndpoint,
  updateEndpoint,
  deleteEndpoint,
  regenerateEndpointToken,
  getEndpointModels,
} from "../../core/endpoint/service.js";
import { mapNotFound } from "./utils.js";

const CreateEndpointInputSchema = z.object({
  name: z.string().min(1),
  path: EndpointPathSchema,
  modelIds: z.array(z.string()).default([]),
  groupIds: z.array(z.string()).default([]),
});

const UpdateEndpointInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  path: EndpointPathSchema.optional(),
  enabled: z.boolean().optional(),
  modelIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
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

  list: protectedProcedure.query(({ ctx }) => {
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
