import type { Model, Provider } from "@rel-ai/shared";
import type { ResolvedModel } from "./types.js";
import {
  ModelNotFoundError,
  ProviderNotFoundError,
  CircularDependencyError,
  AllProvidersFailedError,
} from "./errors.js";

type ModelLookup = (id: string) => Model | undefined;
type ProviderLookup = (id: string) => Provider | undefined;

export interface ModelResolverOptions {
  getModel: ModelLookup;
  getProvider: ProviderLookup;
  unhealthyDuration?: number;
}

export class ModelResolver {
  private getModel: ModelLookup;
  private getProvider: ProviderLookup;
  private unhealthyDuration: number;
  private unhealthyProviders = new Map<string, number>(); // providerId -> expiry timestamp

  constructor(options: ModelResolverOptions) {
    this.getModel = options.getModel;
    this.getProvider = options.getProvider;
    this.unhealthyDuration = options.unhealthyDuration ?? 60_000;
  }

  resolve(modelId: string, visited: Set<string> = new Set()): ResolvedModel {
    if (visited.has(modelId)) {
      throw new CircularDependencyError([...visited, modelId]);
    }
    visited.add(modelId);

    const model = this.getModel(modelId);
    if (!model) {
      throw new ModelNotFoundError(modelId);
    }

    if (model.type === "real") {
      const provider = this.getProvider(model.providerId);
      if (!provider) {
        throw new ProviderNotFoundError(model.providerId);
      }
      return {
        providerId: provider.id,
        providerModel: model.providerModel,
        adapterType: provider.adapterType,
        overrides: {},
      };
    }

    // Virtual model
    if (model.variant === "tuned") {
      if (!model.baseModelId) {
        throw new ModelNotFoundError(`${modelId} (tuned model missing baseModelId)`);
      }
      const base = this.resolve(model.baseModelId, new Set(visited));
      return {
        ...base,
        overrides: deepMerge(base.overrides, model.overrides ?? {}),
      };
    }

    // Fallback variant
    if (!model.fallbackChain || model.fallbackChain.length === 0) {
      throw new AllProvidersFailedError(modelId);
    }

    for (const fallbackModelId of model.fallbackChain) {
      if (visited.has(fallbackModelId)) {
        throw new CircularDependencyError([...visited, fallbackModelId]);
      }

      const fallbackModel = this.getModel(fallbackModelId);
      if (!fallbackModel) continue;

      // Only consider real models in fallback chain for provider health checks
      if (fallbackModel.type === "real") {
        if (!this.isHealthy(fallbackModel.providerId)) continue;

        const provider = this.getProvider(fallbackModel.providerId);
        if (!provider) continue;

        return {
          providerId: provider.id,
          providerModel: fallbackModel.providerModel,
          adapterType: provider.adapterType,
          overrides: {},
        };
      }

      // Virtual model in fallback chain — resolve recursively
      try {
        return this.resolve(fallbackModelId, new Set(visited));
      } catch (e) {
        if (e instanceof CircularDependencyError) throw e;
        continue;
      }
    }

    throw new AllProvidersFailedError(modelId);
  }

  markUnhealthy(providerId: string, durationMs?: number): void {
    const duration = durationMs ?? this.unhealthyDuration;
    this.unhealthyProviders.set(providerId, Date.now() + duration);
  }

  isHealthy(providerId: string): boolean {
    const expiry = this.unhealthyProviders.get(providerId);
    if (expiry === undefined) return true;
    if (Date.now() >= expiry) {
      this.unhealthyProviders.delete(providerId);
      return true;
    }
    return false;
  }
}

function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(overlay)) {
    const baseVal = base[key];
    const overlayVal = overlay[key];
    if (
      isPlainObject(baseVal) &&
      isPlainObject(overlayVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overlayVal as Record<string, unknown>,
      );
    } else {
      result[key] = overlayVal;
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
