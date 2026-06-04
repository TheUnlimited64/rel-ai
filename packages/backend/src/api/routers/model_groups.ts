import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import {
  createModelGroup,
  listModelGroups,
  getModelGroup,
  updateModelGroup,
  deleteModelGroup,
  setGroupEntry,
  removeGroupEntry,
} from "../../core/model-group/service.js";
import { mapNotFound } from "./utils.js";

const IdInput = z.object({ id: z.string().min(1) });

export const modelGroupsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        interfaceId: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      try {
        return createModelGroup(ctx.db, input);
      } catch (e) {
        if (e instanceof Error && e.message === "INTERFACE_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Interface group not found" });
        }
        throw e;
      }
    }),

  list: protectedProcedure.query(({ ctx }) => listModelGroups(ctx.db)),

  get: protectedProcedure
    .input(IdInput)
    .query(({ ctx, input }) => mapNotFound(async () => getModelGroup(ctx.db, input.id))),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => mapNotFound(async () => updateModelGroup(ctx.db, input))),

  delete: protectedProcedure
    .input(IdInput)
    .mutation(({ ctx, input }) => {
      try {
        return deleteModelGroup(ctx.db, input.id);
      } catch (e) {
        if (e instanceof Error && e.message === "NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
        }
        if (e instanceof Error && e.message.startsWith("HAS_DEPENDENTS:")) {
          throw new TRPCError({ code: "CONFLICT", message: e.message });
        }
        throw e;
      }
    }),

  setEntry: protectedProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        virtualName: z.string().min(1),
        modelId: z.string().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      try {
        return setGroupEntry(ctx.db, input);
      } catch (e) {
        if (e instanceof Error && e.message === "GROUP_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
        }
        if (e instanceof Error && e.message === "MODEL_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });
        }
        if (e instanceof Error && e.message === "INVALID_VIRTUAL_NAME") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Virtual name cannot be empty" });
        }
        throw e;
      }
    }),

  removeEntry: protectedProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        virtualName: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      mapNotFound(async () => removeGroupEntry(ctx.db, input)),
    ),
});
