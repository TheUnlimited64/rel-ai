import type { AdapterType } from "@rel-ai/shared";
import { AdapterTypeSchema } from "@rel-ai/shared";

export type { AdapterType };

export const ADAPTER_TYPES = AdapterTypeSchema.options;

export type ProviderResponse = {
  id: string;
  name: string;
  adapterType: AdapterType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  config: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProviderResponse = ProviderResponse & {
  apiKeyRaw: string;
};

export function maskApiKey(key: string): string {
  if (!key || key.length <= 7) return "****";
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}
