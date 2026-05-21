import type { AdapterType } from "@rel-ai/shared";

export type { AdapterType };

export type ProviderResponse = {
  id: string;
  name: string;
  adapterType: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  config: string | null;
  createdAt: string;
  updatedAt: string;
};
