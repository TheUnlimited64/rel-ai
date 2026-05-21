import { trpc } from "@/lib/trpc";
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

export async function fetchProviders(): Promise<ProviderResponse[]> {
  return trpc.providers.list.query();
}

export async function fetchProvider(id: string): Promise<ProviderResponse> {
  return trpc.providers.get.query({ id });
}

export async function createProvider(input: {
  name: string;
  adapterType: AdapterType;
  baseUrl: string;
  apiKey: string;
  config?: Record<string, unknown>;
}): Promise<ProviderResponse> {
  return trpc.providers.create.mutate(input);
}

export async function updateProvider(input: {
  id: string;
  name?: string;
  adapterType?: AdapterType;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): Promise<ProviderResponse> {
  return trpc.providers.update.mutate(input);
}

export async function deleteProvider(id: string): Promise<{ success: boolean }> {
  return trpc.providers.delete.mutate({ id });
}

export async function testConnection(
  id: string,
): Promise<{ success: boolean; error?: string; latencyMs: number }> {
  return trpc.providers.testConnection.mutate({ id });
}
