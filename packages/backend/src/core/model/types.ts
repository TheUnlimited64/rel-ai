import type { AdapterType } from "@rel-ai/shared";

export type ResolvedModel = {
  providerId: string;
  providerModel: string;
  adapterType: AdapterType;
  overrides: Record<string, unknown>;
};
