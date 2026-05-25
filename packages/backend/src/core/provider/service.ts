import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "../auth/encryption.js";
import { providers } from "../../db/schema/providers.js";
import { models } from "../../db/schema/models.js";
import type { DbClient } from "../../db/connection.js";
import type { AdapterRegistry } from "./registry.js";

export type ProviderRow = typeof providers.$inferSelect;

export interface ProviderResponse {
  id: string;
  name: string;
  adapterType: string;
  baseUrl: string;
  maskedApiKey: string;
  enabled: boolean;
  config: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderResponse extends ProviderResponse {
  apiKeyRaw: string;
}

function toResponse(row: ProviderRow, maskedKey: string): ProviderResponse {
  return {
    id: row.id,
    name: row.name,
    adapterType: row.adapterType,
    baseUrl: row.baseUrl,
    maskedApiKey: maskedKey,
    enabled: row.enabled,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function isEncryptedKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export async function maskApiKey(encryptedKey: string): Promise<string> {
  if (!isEncryptedKey(encryptedKey)) return "****";
  try {
    const decrypted = await decrypt(encryptedKey);
    if (decrypted.length <= 3) return "****";
    return `${decrypted.slice(0, 3)}****`;
  } catch {
    return "****";
  }
}

export async function createProvider(
  db: DbClient,
  input: {
    name: string;
    adapterType: string;
    baseUrl: string;
    apiKey: string;
    config?: Record<string, unknown>;
  },
): Promise<CreateProviderResponse> {
  const id = crypto.randomUUID();
  const encryptedKey = await encrypt(input.apiKey);
  const configJson = input.config ? JSON.stringify(input.config) : null;
  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;

  // Synchronous DB call blocks the event loop — acceptable for homelab scale where concurrency is low
  // TODO: Migrate to async drizzle queries for production scale
  db.insert(providers)
    .values({
      id,
      name: input.name,
      adapterType: input.adapterType,
      baseUrl: input.baseUrl,
      apiKey: encryptedKey,
      config: configJson,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");
  const masked = await maskApiKey(encryptedKey);
  return { ...toResponse(row, masked), apiKeyRaw: input.apiKey };
}

export async function listProviders(db: DbClient): Promise<ProviderResponse[]> {
  const rows = db.select().from(providers).all();
  const results: ProviderResponse[] = [];
  for (const row of rows) {
    const masked = await maskApiKey(row.apiKey);
    results.push(toResponse(row, masked));
  }
  return results;
}

export async function getProvider(db: DbClient, id: string): Promise<ProviderResponse> {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");
  const masked = await maskApiKey(row.apiKey);
  return toResponse(row, masked);
}

export async function updateProvider(
  db: DbClient,
  input: {
    id: string;
    name?: string;
    adapterType?: string;
    baseUrl?: string;
    apiKey?: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  },
): Promise<ProviderResponse> {
  const existing = db.select().from(providers).where(eq(providers.id, input.id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  const updates: Partial<typeof providers.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.adapterType !== undefined) updates.adapterType = input.adapterType;
  if (input.baseUrl !== undefined) updates.baseUrl = input.baseUrl;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  if (input.apiKey !== undefined) updates.apiKey = await encrypt(input.apiKey);
  if (input.config !== undefined) updates.config = JSON.stringify(input.config);

  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;
  updates.updatedAt = now;

  // Synchronous DB call blocks the event loop — acceptable for homelab scale where concurrency is low
  // TODO: Migrate to async drizzle queries for production scale
  db.update(providers).set(updates).where(eq(providers.id, input.id)).run();

  const row = db.select().from(providers).where(eq(providers.id, input.id)).get();
  if (!row) throw new Error("NOT_FOUND");
  const masked = await maskApiKey(row.apiKey);
  return toResponse(row, masked);
}

export async function deleteProvider(db: DbClient, id: string): Promise<{ success: boolean }> {
  const existing = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!existing) throw new Error("NOT_FOUND");

  // Cascade delete related models in transaction
  // Synchronous DB call blocks the event loop — acceptable for homelab scale where concurrency is low
  // TODO: Migrate to async drizzle queries for production scale
  db.transaction((tx) => {
    tx.delete(models).where(eq(models.providerId, id)).run();
    tx.delete(providers).where(eq(providers.id, id)).run();
  });

  return { success: true };
}

export async function regenerateApiKey(
  db: DbClient,
  id: string,
): Promise<CreateProviderResponse> {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const rawKey = `sk_${hex}`;
  const encryptedKey = await encrypt(rawKey);
  const now = new Date().toISOString().replace("T", " ").split(".")[0]!;

  // Synchronous DB call blocks the event loop — acceptable for homelab scale where concurrency is low
  // TODO: Migrate to async drizzle queries for production scale
  db.update(providers)
    .set({ apiKey: encryptedKey, updatedAt: now })
    .where(eq(providers.id, id))
    .run();

  const updated = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!updated) throw new Error("NOT_FOUND");
  const masked = await maskApiKey(encryptedKey);
  return { ...toResponse(updated, masked), apiKeyRaw: rawKey };
}

export async function testProviderConnection(
  db: DbClient,
  id: string,
  registry: AdapterRegistry,
): Promise<{ success: boolean; error?: string; latencyMs: number }> {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) throw new Error("NOT_FOUND");

  const apiKey = await decrypt(row.apiKey);
  const baseUrl = row.baseUrl.replace(/\/$/, "");
  const adapterType = row.adapterType as string;

  const adapter = registry.has(adapterType) ? registry.get(adapterType) : null;
  if (adapter?.testConnection) {
    return adapter.testConnection(baseUrl, apiKey);
  }

  const url = `${baseUrl}/v1/models`;

  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    }

    return { success: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message, latencyMs };
  }
}
