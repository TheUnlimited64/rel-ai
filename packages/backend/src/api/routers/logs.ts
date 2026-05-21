import { z } from "zod";
import { lt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { RequestLogQuery } from "../../core/logging/query.js";
import { RequestLogger } from "../../core/logging/logger.js";
import { requestLogs } from "../../db/schema/request_logs.js";

const listInput = z.object({
  endpointId: z.string().optional(),
  providerId: z.string().optional(),
  status: z.enum(["success", "error", "rate_limited"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
});

const statsInput = z.object({
  endpointId: z.string().optional(),
  providerId: z.string().optional(),
  status: z.enum(["success", "error", "rate_limited"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const clearInput = z.object({
  before: z.string().optional(),
});

export const logsRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(({ ctx, input }) => {
    const query = new RequestLogQuery(ctx.db);
    return query.list({
      ...input,
      limit: Math.min(input.limit, 500),
    });
  }),

  stats: protectedProcedure.input(statsInput).query(({ ctx, input }) => {
    const query = new RequestLogQuery(ctx.db);
    return query.stats(input);
  }),

  clear: protectedProcedure.input(clearInput).mutation(({ ctx, input }) => {
    const logger = new RequestLogger(ctx.db);
    if (input.before) {
      ctx.db
        .delete(requestLogs)
        .where(lt(requestLogs.createdAt, input.before!))
        .run();
      return { success: true };
    }
    logger.purgeOldLogs();
    return { success: true };
  }),
});
