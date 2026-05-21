import { trpc } from "@/lib/trpc";

export type RealModelResponse = {
  id: string;
  displayName: string;
  type: "real";
  providerId: string;
  providerModel: string;
  createdAt: string;
  updatedAt: string;
};

export type VirtualFallbackModelResponse = {
  id: string;
  displayName: string;
  type: "virtual";
  variant: "fallback";
  fallbackChain: string[];
  createdAt: string;
  updatedAt: string;
};

export type VirtualTunedModelResponse = {
  id: string;
  displayName: string;
  type: "virtual";
  variant: "tuned";
  baseModelId: string;
  overrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ModelResponse =
  | RealModelResponse
  | VirtualFallbackModelResponse
  | VirtualTunedModelResponse;

export type ProviderOption = {
  id: string;
  name: string;
  adapterType: string;
};

export async function fetchModels(): Promise<ModelResponse[]> {
  return trpc.models.list.query();
}

export async function fetchModel(id: string): Promise<ModelResponse> {
  return trpc.models.get.query({ id });
}

export async function createRealModel(input: {
  id: string;
  providerId: string;
  providerModel: string;
  displayName?: string;
}): Promise<RealModelResponse> {
  return trpc.models.createReal.mutate(input) as Promise<RealModelResponse>;
}

export async function createVirtualFallback(input: {
  id: string;
  fallbackChain: string[];
  displayName?: string;
}): Promise<VirtualFallbackModelResponse> {
  return trpc.models.createVirtualFallback.mutate(input) as Promise<VirtualFallbackModelResponse>;
}

export async function createVirtualTuned(input: {
  id: string;
  baseModelId: string;
  overrides?: Record<string, unknown>;
  displayName?: string;
}): Promise<VirtualTunedModelResponse> {
  return trpc.models.createVirtualTuned.mutate(input) as Promise<VirtualTunedModelResponse>;
}

export async function updateModel(input: {
  id: string;
  displayName?: string;
  providerModel?: string;
  fallbackChain?: string[];
  baseModelId?: string;
  overrides?: Record<string, unknown>;
}): Promise<ModelResponse> {
  return trpc.models.update.mutate(input);
}

export async function deleteModel(id: string): Promise<{ success: boolean }> {
  return trpc.models.delete.mutate({ id });
}

export async function testResolution(id: string): Promise<{
  steps: Array<{ modelId: string; providerId: string; providerModel: string; adapterType: string }>;
}> {
  return trpc.models.testResolution.mutate({ id });
}

export async function fetchProviders(): Promise<ProviderOption[]> {
  return trpc.providers.list.query();
}
