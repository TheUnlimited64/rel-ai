import { z } from "zod";
import { AdapterTypeSchema } from "./enums.js";

export const ProviderSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  adapterType: AdapterTypeSchema,
  baseUrl: z.url(),
  apiKey: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const CreateProviderSchema = z.object({
  name: z.string().min(1),
  adapterType: AdapterTypeSchema,
  baseUrl: z.url(),
  apiKey: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type CreateProvider = z.infer<typeof CreateProviderSchema>;
