import { z } from "zod";

export const RealModelSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  providerId: z.string().uuid(),
  providerModel: z.string().min(1),
  type: z.literal("real"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RealModel = z.infer<typeof RealModelSchema>;

export const VirtualModelSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  type: z.literal("virtual"),
  variant: z.enum(["fallback", "tuned"]),
  fallbackChain: z.array(z.string()).optional(),
  baseModelId: z.string().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VirtualModel = z.infer<typeof VirtualModelSchema>;

export const ModelSchema = z.discriminatedUnion("type", [
  RealModelSchema,
  VirtualModelSchema,
]);

export type Model = z.infer<typeof ModelSchema>;

export const CreateRealModelSchema = z.object({
  displayName: z.string().min(1),
  providerId: z.string().uuid(),
  providerModel: z.string().min(1),
  type: z.literal("real"),
}).strict();

export type CreateRealModel = z.infer<typeof CreateRealModelSchema>;

export const CreateVirtualModelSchema = z.object({
  displayName: z.string().min(1),
  type: z.literal("virtual"),
  variant: z.enum(["fallback", "tuned"]),
  fallbackChain: z.array(z.string()).optional(),
  baseModelId: z.string().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type CreateVirtualModel = z.infer<typeof CreateVirtualModelSchema>;

export const CreateModelSchema = z.discriminatedUnion("type", [
  CreateRealModelSchema,
  CreateVirtualModelSchema,
]);

export type CreateModel = z.infer<typeof CreateModelSchema>;
