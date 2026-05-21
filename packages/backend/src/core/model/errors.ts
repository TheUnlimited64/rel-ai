export class ModelNotFoundError extends Error {
  modelId: string;

  constructor(modelId: string) {
    super(`Model not found: ${modelId}`);
    this.name = "ModelNotFoundError";
    this.modelId = modelId;
  }
}

export class ProviderNotFoundError extends Error {
  providerId: string;

  constructor(providerId: string) {
    super(`Provider not found: ${providerId}`);
    this.name = "ProviderNotFoundError";
    this.providerId = providerId;
  }
}

export class CircularDependencyError extends Error {
  chain: string[];

  constructor(chain: string[]) {
    super(`Circular dependency detected: ${chain.join(" → ")}`);
    this.name = "CircularDependencyError";
    this.chain = chain;
  }
}

export class AllProvidersFailedError extends Error {
  modelId: string;

  constructor(modelId: string) {
    super(`All providers failed for model: ${modelId}`);
    this.name = "AllProvidersFailedError";
    this.modelId = modelId;
  }
}
