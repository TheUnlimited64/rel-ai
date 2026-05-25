import { eq } from "drizzle-orm";
import { models } from "../../db/schema/models.js";
import { providers } from "../../db/schema/providers.js";
import type { DbClient } from "../../db/connection.js";
import { ModelResolver } from "./resolver.js";
import type { Model, Provider } from "@rel-ai/shared";

export type ModelRow = typeof models.$inferSelect;

export interface RealModelResponse {
  id: string;
  displayName: string;
  type: "real";
  providerId: string;
  providerModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualFallbackModelResponse {
  id: string;
  displayName: string;
  type: "virtual";
  variant: "fallback";
  fallbackChain: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VirtualTunedModelResponse {
  id: string;
  displayName: string;
  type: "virtual";
  variant: "tuned";
  baseModelId: string;
  overrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ModelResponse =
  | RealModelResponse
  | VirtualFallbackModelResponse
  | VirtualTunedModelResponse;

function deserializeModel(row: ModelRow): ModelResponse {
  if (row.type === "real") {
    return {
      id: row.id,
      displayName: row.displayName,
      type: "real",
      providerId: row.providerId!,
      providerModel: row.providerModel!,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  if (row.variant === "fallback") {
    return {
      id: row.id,
      displayName: row.displayName,
      type: "virtual",
      variant: "fallback",
      fallbackChain: row.fallbackChain ? JSON.parse(row.fallbackChain) : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  // tuned
  return {
    id: row.id,
    displayName: row.displayName,
    type: "virtual",
    variant: "tuned",
    baseModelId: row.baseModelId!,
    overrides: row.overrides ? JSON.parse(row.overrides) : {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function deserializeProvider(row: typeof providers.$inferSelect): Provider {
  return {
    id: row.id,
    name: row.name,
    adapterType: row.adapterType as Provider["adapterType"],
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    enabled: row.enabled,
    config: row.config ? JSON.parse(row.config) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function detectCircular(
  modelId: string,
  fallbackChain: string[],
  getChain: (id: string) => string[] | null,
): boolean {
  const visited = new Set<string>();
  const queue = [...fallbackChain];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === modelId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const chain = getChain(current);
    if (chain) queue.push(...chain);
  }
  return false;
}

function getDependents(db: DbClient, modelId: string): string[] {
  const allModels = db.select().from(models).all();
  const dependents: string[] = [];
  for (const m of allModels) {
    if (m.id === modelId) continue;
    if (m.baseModelId === modelId) {
      dependents.push(m.id);
      continue;
    }
    if (m.fallbackChain) {
      const chain = JSON.parse(m.fallbackChain) as string[];
      if (chain.includes(modelId)) {
        dependents.push(m.id);
      }
    }
  }
  return dependents;
}

export function createRealModel(
  db: DbClient,
  input: { id: string; providerId: string; providerModel: string; displayName?: string },
): ModelResponse {
  // Validate provider exists
  const provider = db.select().from(providers).where(eq(providers.id, input.providerId)).get();
  if (!provider) throw new Error("PROVIDER_NOT_FOUND");

  // Check id uniqueness
  const existing = db.select().from(models).where(eq(models.id, input.id)).get();
  if (existing) throw new Error("DUPLICATE_ID");

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  db.transaction((tx) => {
    tx.insert(models)
      .values({
        id: input.id,
        displayName: input.displayName ?? input.id,
        type: "real",
        providerId: input.providerId,
        providerModel: input.providerModel,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  const row = db.select().from(models).where(eq(models.id, input.id)).get()!;
  return deserializeModel(row);
}

export function createVirtualFallbackModel(
  db: DbClient,
  input: { id: string; fallbackChain: string[]; displayName?: string },
): ModelResponse {
  // Check id uniqueness
  const existing = db.select().from(models).where(eq(models.id, input.id)).get();
  if (existing) throw new Error("DUPLICATE_ID");

  // Check for self-reference (circular) before existence check
  if (input.fallbackChain.includes(input.id)) throw new Error("CIRCULAR_DEPENDENCY");

  // Validate all models in chain exist
  for (const chainId of input.fallbackChain) {
    const m = db.select().from(models).where(eq(models.id, chainId)).get();
    if (!m) throw new Error(`MODEL_NOT_FOUND:${chainId}`);
  }

  // Circular dependency detection (transitive)
  const isCircular = detectCircular(input.id, input.fallbackChain, (id) => {
    const m = db.select().from(models).where(eq(models.id, id)).get();
    if (!m) return null;
    if (m.type === "virtual" && m.variant === "fallback" && m.fallbackChain) {
      return JSON.parse(m.fallbackChain) as string[];
    }
    return null;
  });
  if (isCircular) throw new Error("CIRCULAR_DEPENDENCY");

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  db.transaction((tx) => {
    tx.insert(models)
      .values({
        id: input.id,
        displayName: input.displayName ?? input.id,
        type: "virtual",
        variant: "fallback",
        fallbackChain: JSON.stringify(input.fallbackChain),
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  const row = db.select().from(models).where(eq(models.id, input.id)).get()!;
  return deserializeModel(row);
}

export function createVirtualTunedModel(
  db: DbClient,
  input: { id: string; baseModelId: string; overrides?: Record<string, unknown>; displayName?: string },
): ModelResponse {
  // Check id uniqueness
  const existing = db.select().from(models).where(eq(models.id, input.id)).get();
  if (existing) throw new Error("DUPLICATE_ID");

  // Validate base model exists
  const baseModel = db.select().from(models).where(eq(models.id, input.baseModelId)).get();
  if (!baseModel) throw new Error("BASE_MODEL_NOT_FOUND");

  // Validate baseModelId points to real or tuned model — NOT fallback
  if (baseModel.type === "virtual" && baseModel.variant === "fallback") {
    throw new Error("INVALID_BASE_MODEL");
  }

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  db.transaction((tx) => {
    tx.insert(models)
      .values({
        id: input.id,
        displayName: input.displayName ?? input.id,
        type: "virtual",
        variant: "tuned",
        baseModelId: input.baseModelId,
        overrides: input.overrides ? JSON.stringify(input.overrides) : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  const row = db.select().from(models).where(eq(models.id, input.id)).get()!;
  return deserializeModel(row);
}

export function listModels(db: DbClient): ModelResponse[] {
  const rows = db.select().from(models).all();
  return rows.map(deserializeModel);
}

export function getModel(db: DbClient, id: string): ModelResponse {
  const row = db.select().from(models).where(eq(models.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");
  return deserializeModel(row);
}

export function updateModel(
  db: DbClient,
  input: {
    id: string;
    displayName?: string;
    providerModel?: string;
    fallbackChain?: string[];
    baseModelId?: string;
    overrides?: Record<string, unknown>;
  },
): ModelResponse {
  const existing = db.select().from(models).where(eq(models.id, input.id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const updates: Partial<typeof models.$inferInsert> = {};

  if (input.displayName !== undefined) updates.displayName = input.displayName;

  if (existing.type === "real") {
    if (input.providerModel !== undefined) updates.providerModel = input.providerModel;
  }

  if (existing.type === "virtual" && existing.variant === "fallback") {
    if (input.fallbackChain !== undefined) {
      // Validate all models in chain exist
      for (const chainId of input.fallbackChain) {
        const m = db.select().from(models).where(eq(models.id, chainId)).get();
        if (!m) throw new Error(`MODEL_NOT_FOUND:${chainId}`);
      }
      // Circular dependency check
      const isCircular = detectCircular(input.id, input.fallbackChain, (id) => {
        const m = db.select().from(models).where(eq(models.id, id)).get();
        if (!m) return null;
        if (m.type === "virtual" && m.variant === "fallback" && m.fallbackChain) {
          return JSON.parse(m.fallbackChain) as string[];
        }
        return null;
      });
      if (isCircular) throw new Error("CIRCULAR_DEPENDENCY");
      updates.fallbackChain = JSON.stringify(input.fallbackChain);
    }
  }

  if (existing.type === "virtual" && existing.variant === "tuned") {
    if (input.baseModelId !== undefined) {
      const baseModel = db.select().from(models).where(eq(models.id, input.baseModelId)).get();
      if (!baseModel) throw new Error("BASE_MODEL_NOT_FOUND");
      if (baseModel.type === "virtual" && baseModel.variant === "fallback") {
        throw new Error("INVALID_BASE_MODEL");
      }
      updates.baseModelId = input.baseModelId;
    }
    if (input.overrides !== undefined) {
      updates.overrides = JSON.stringify(input.overrides);
    }
  }

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  updates.updatedAt = now;

  db.transaction((tx) => {
    tx.update(models).set(updates).where(eq(models.id, input.id)).run();
  });

  const row = db.select().from(models).where(eq(models.id, input.id)).get()!;
  return deserializeModel(row);
}

export function deleteModel(db: DbClient, id: string): { success: boolean } {
  const existing = db.select().from(models).where(eq(models.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const dependents = getDependents(db, id);
  if (dependents.length > 0) {
    throw new Error(`HAS_DEPENDENTS:${JSON.stringify(dependents)}`);
  }

  db.transaction((tx) => {
    tx.delete(models).where(eq(models.id, id)).run();
  });
  return { success: true };
}

export function testResolution(
  db: DbClient,
  modelId: string,
): { steps: Array<{ modelId: string; providerId: string; providerModel: string; adapterType: string }> } {
  const allModels = db.select().from(models).all();
  const allProviders = db.select().from(providers).all();

  const modelMap = new Map(allModels.map((m) => [m.id, deserializeModel(m)]));
  const providerMap = new Map(allProviders.map((p) => [p.id, deserializeProvider(p)]));

  const resolver = new ModelResolver({
    getModel: (id) => modelMap.get(id) as Model | undefined,
    getProvider: (id) => providerMap.get(id) as Provider | undefined,
  });

  const resolved = resolver.resolve(modelId);
  return {
    steps: [
      {
        modelId,
        providerId: resolved.providerId,
        providerModel: resolved.providerModel,
        adapterType: resolved.adapterType,
      },
    ],
  };
}
