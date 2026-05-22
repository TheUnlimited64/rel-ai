import { eq, and, sql } from "drizzle-orm";
import { generateToken } from "../auth/token.js";
import { endpoints } from "../../db/schema/endpoints.js";
import { endpointModels } from "../../db/schema/endpoint_models.js";
import { models } from "../../db/schema/models.js";
import type { DbClient } from "../../db/connection.js";

export type EndpointRow = typeof endpoints.$inferSelect;

function getProxyBase(): string {
  return process.env.PROXY_BASE_URL ?? `http://localhost:${process.env.PORT || 3000}/v1`;
}

export interface EndpointCreateResponse {
  id: string;
  name: string;
  path: string;
  token: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  proxyBase: string;
}

export interface EndpointListResponse {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  modelCount: number;
  proxyBase: string;
}

export interface EndpointGetResponse {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  models: { id: string; displayName: string }[];
  proxyBase: string;
}

const PATH_REGEX = /^[a-z0-9-]+$/;

function validatePath(path: string): void {
  if (!PATH_REGEX.test(path)) {
    throw new Error("INVALID_PATH");
  }
}

export async function createEndpoint(
  db: DbClient,
  input: { name: string; path: string; modelIds: string[] },
): Promise<EndpointCreateResponse> {
  validatePath(input.path);

  const { token, hash } = await generateToken();
  const id = crypto.randomUUID();

  try {
    db.transaction((tx) => {
      tx.insert(endpoints)
        .values({
          id,
          name: input.name,
          path: input.path,
          tokenHash: hash,
        })
        .run();

      for (const modelId of input.modelIds) {
        tx.insert(endpointModels).values({ endpointId: id, modelId }).run();
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throw new Error("DUPLICATE_PATH");
    }
    throw err;
  }

  const row = db.select().from(endpoints).where(eq(endpoints.id, id)).get()!;

  const proxyBase = getProxyBase();

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    token,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    proxyBase,
  };
}

export async function listEndpoints(db: DbClient): Promise<EndpointListResponse[]> {
  const rows = db.select().from(endpoints).all();

  const results: EndpointListResponse[] = [];
  for (const row of rows) {
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(endpointModels)
      .where(eq(endpointModels.endpointId, row.id))
      .get()!;

    results.push({
      id: row.id,
      name: row.name,
      path: row.path,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      modelCount: Number(countResult.count),
      proxyBase: getProxyBase(),
    });
  }

  return results;
}

export async function getEndpoint(
  db: DbClient,
  id: string,
): Promise<EndpointGetResponse> {
  const row = db.select().from(endpoints).where(eq(endpoints.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");

  const junctionRows = db
    .select({ modelId: endpointModels.modelId })
    .from(endpointModels)
    .where(eq(endpointModels.endpointId, id))
    .all();

  const modelList: { id: string; displayName: string }[] = [];
  for (const j of junctionRows) {
    const m = db.select().from(models).where(eq(models.id, j.modelId)).get();
    if (m) {
      modelList.push({ id: m.id, displayName: m.displayName });
    }
  }

  return {
    id: row.id,
    name: row.name,
    path: row.path,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    models: modelList,
    proxyBase: getProxyBase(),
  };
}

export async function updateEndpoint(
  db: DbClient,
  input: {
    id: string;
    name?: string;
    path?: string;
    enabled?: boolean;
    modelIds?: string[];
  },
): Promise<EndpointGetResponse> {
  const existing = db.select().from(endpoints).where(eq(endpoints.id, input.id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const updates: Partial<typeof endpoints.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.path !== undefined) {
    validatePath(input.path);
    updates.path = input.path;
  }
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  updates.updatedAt = now;

  try {
    db.transaction((tx) => {
      tx.update(endpoints).set(updates).where(eq(endpoints.id, input.id)).run();

      // Update model associations if provided
      if (input.modelIds !== undefined) {
        tx.delete(endpointModels).where(eq(endpointModels.endpointId, input.id)).run();
        for (const modelId of input.modelIds) {
          tx.insert(endpointModels).values({ endpointId: input.id, modelId }).run();
        }
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throw new Error("DUPLICATE_PATH");
    }
    throw err;
  }

  return getEndpoint(db, input.id);
}

export async function deleteEndpoint(
  db: DbClient,
  id: string,
): Promise<{ success: boolean }> {
  const existing = db.select().from(endpoints).where(eq(endpoints.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  // Junction entries cascade deleted by FK
  db.delete(endpoints).where(eq(endpoints.id, id)).run();

  return { success: true };
}

export async function regenerateEndpointToken(
  db: DbClient,
  id: string,
): Promise<{ token: string }> {
  const existing = db.select().from(endpoints).where(eq(endpoints.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const { token, hash } = await generateToken();
  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;

  db.update(endpoints)
    .set({ tokenHash: hash, updatedAt: now })
    .where(eq(endpoints.id, id))
    .run();

  return { token };
}

export async function getEndpointModels(
  db: DbClient,
  id: string,
): Promise<{ id: string; displayName: string; type: string; providerId: string | null }[]> {
  const existing = db.select().from(endpoints).where(eq(endpoints.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const junctionRows = db
    .select({ modelId: endpointModels.modelId })
    .from(endpointModels)
    .where(eq(endpointModels.endpointId, id))
    .all();

  const result: { id: string; displayName: string; type: string; providerId: string | null }[] = [];
  for (const j of junctionRows) {
    const m = db.select().from(models).where(eq(models.id, j.modelId)).get();
    if (m) {
      result.push({
        id: m.id,
        displayName: m.displayName,
        type: m.type,
        providerId: m.providerId,
      });
    }
  }

  return result;
}
