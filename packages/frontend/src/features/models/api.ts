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
