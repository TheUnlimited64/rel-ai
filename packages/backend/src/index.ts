import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./api/router.js";
import { createContextFactory } from "./api/context.js";
import { VERSION } from "@rel-ai/shared";
import { createDb } from "./db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createProxyRouter } from "./routes/proxy.js";
import { ProxyHandler } from "./core/proxy/handler.js";
import type { ProviderCredentials } from "./core/proxy/handler.js";
import { ModelResolver } from "./core/model/resolver.js";
import { AdapterRegistry } from "./core/provider/registry.js";
import { migratePlaintextApiKeys } from "./core/provider/migrate.js";
import { OpenAIAdapter } from "./adapters/openai/adapter.js";
import { AnthropicAdapter } from "./adapters/anthropic/adapter.js";
import { decrypt } from "./core/auth/encryption.js";
import { providers, models as modelsTable } from "./db/schema/index.js";
import { eq } from "drizzle-orm";
import type { Model, Provider } from "@rel-ai/shared";
import { RequestLogger } from "./core/logging/logger.js";

const db = createDb();
migrate(db, { migrationsFolder: "./src/db/migrations" });
await migratePlaintextApiKeys(db);

const createContext = createContextFactory(db);

// Initialize adapter registry
const registry = new AdapterRegistry();
registry.register(new OpenAIAdapter()); // reads apiKey/baseUrl from overrides per-request
registry.register(new AnthropicAdapter()); // reads apiKey/baseUrl from overrides per-request

// Build model lookup from DB (sync — DB data is in-memory for SQLite)
function getModelFromDb(id: string): Model | undefined {
  const row = db.select().from(modelsTable).where(eq(modelsTable.id, id)).get();
  if (!row) return undefined;

  if (row.type === "real") {
    return {
      id: row.id,
      displayName: row.displayName,
      providerId: row.providerId!,
      providerModel: row.providerModel!,
      type: "real",
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  return {
    id: row.id,
    displayName: row.displayName,
    type: "virtual",
    variant: (row.variant as "fallback" | "tuned") ?? "fallback",
    fallbackChain: row.fallbackChain ? JSON.parse(row.fallbackChain) : undefined,
    baseModelId: row.baseModelId ?? undefined,
    overrides: row.overrides ? JSON.parse(row.overrides) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

// Build provider lookup from DB (sync — returns encrypted apiKey)
function getProviderFromDb(id: string): Provider | undefined {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) return undefined;

  return {
    id: row.id,
    name: row.name,
    adapterType: row.adapterType as "openai" | "anthropic" | "custom",
    baseUrl: row.baseUrl,
    apiKey: row.apiKey, // encrypted in DB
    enabled: row.enabled,
    config: row.config ? JSON.parse(row.config) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

// Async credential lookup — decrypts API key for provider requests
async function getProviderCredentials(providerId: string): Promise<ProviderCredentials | null> {
  const provider = getProviderFromDb(providerId);
  if (!provider) return null;

  const apiKey = await decrypt(provider.apiKey);
  return { baseUrl: provider.baseUrl, apiKey };
}

const resolver = new ModelResolver({
  getModel: getModelFromDb,
  getProvider: getProviderFromDb,
});

// Initialize request logger
const requestLogger = new RequestLogger(db);

const proxyHandler = new ProxyHandler({
  resolver,
  registry,
  getProviderCredentials,
  fetchFn: globalThis.fetch,
  onLog: (log) => requestLogger.logFromProxy(log),
});

const app = new Hono();

app.use("/api/trpc/*", trpcServer({ router: appRouter, createContext }));

app.get("/health", (c) => c.json({ status: "ok", version: VERSION }));

// Mount proxy routes
const proxyRouter = createProxyRouter(db, proxyHandler);
app.route("/v1", proxyRouter);

// Serve static frontend files (from public/ directory)
app.use("/*", serveStatic({ root: "./public" }));

// SPA fallback — serve index.html for any unmatched route
app.get("*", serveStatic({ root: "./public", path: "index.html" }));

export function getBackendVersion(): string {
  return VERSION;
}

export { app, appRouter, db };
export type { AppRouter } from "./api/router.js";

const port = Number(process.env.PORT || 3000);
Bun.serve({ fetch: app.fetch, port });
console.log(`RelAI running on http://localhost:${port}`);
