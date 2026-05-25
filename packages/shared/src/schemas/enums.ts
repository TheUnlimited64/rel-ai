import { z } from "zod";

export const AdapterTypeSchema = z.enum(["openai", "anthropic", "custom", "commandcode"]);
export type AdapterType = z.infer<typeof AdapterTypeSchema>;

export const ModelStatusSchema = z.enum(["success", "error", "rate_limited"]);
export type ModelStatus = z.infer<typeof ModelStatusSchema>;
