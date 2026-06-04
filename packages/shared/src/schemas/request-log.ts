import { z } from "zod";
import { ModelStatusSchema } from "./enums.js";

export const RequestLogSchema = z.object({
  id: z.uuid(),
  endpointId: z.uuid(),
  requestedModel: z.string(),
  resolvedModel: z.string().optional(),
  providerId: z.uuid().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  status: ModelStatusSchema,
  errorDetail: z.string().optional(),
  createdAt: z.date(),
});

export type RequestLog = z.infer<typeof RequestLogSchema>;

export const CreateRequestLogSchema = z.object({
  endpointId: z.uuid(),
  requestedModel: z.string(),
  resolvedModel: z.string().optional(),
  providerId: z.uuid().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  status: ModelStatusSchema,
  errorDetail: z.string().optional(),
}).strict();

export type CreateRequestLog = z.infer<typeof CreateRequestLogSchema>;
