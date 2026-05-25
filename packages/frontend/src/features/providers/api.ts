import { z } from "zod";
import { AdapterTypeSchema, type AdapterType } from "@rel-ai/shared";

export type { AdapterType };
export const ADAPTER_TYPES = AdapterTypeSchema.options;

export const ProviderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  adapterType: AdapterTypeSchema,
  baseUrl: z.string(),
  maskedApiKey: z.string(),
  enabled: z.boolean(),
  config: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProviderResponse = z.infer<typeof ProviderResponseSchema>;

export const CreateProviderResponseSchema = ProviderResponseSchema.extend({
  apiKeyRaw: z.string(),
});

export type CreateProviderResponse = z.infer<typeof CreateProviderResponseSchema>;

export function parseProviderResponse(data: unknown): ProviderResponse {
  return ProviderResponseSchema.parse(data);
}

export function parseProviderResponseArray(data: unknown): ProviderResponse[] {
  return z.array(ProviderResponseSchema).parse(data);
}

/** Returns null when result lacks apiKeyRaw or shape is invalid. */
export function extractApiKeyRaw(result: unknown): string | null {
  const parsed = CreateProviderResponseSchema.safeParse(result);
  return parsed.success ? parsed.data.apiKeyRaw : null;
}

export function isAdapterType(value: string): value is AdapterType {
  return (ADAPTER_TYPES as readonly string[]).includes(value);
}

const ADAPTER_LABELS: Record<AdapterType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Custom",
  commandcode: "Command Code",
};

export function formatAdapterLabel(type: AdapterType): string {
  return ADAPTER_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

export function maskApiKey(key: string): string {
  if (!key || key.length <= 7) return "****";
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}
