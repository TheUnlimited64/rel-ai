import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./api/router.js";
import { createContextFactory } from "./api/context.js";
import { VERSION } from "@rel-ai/shared";
import { createDb, createMemoryDb } from "./db/connection.js";
import type { DbClient } from "./db/connection.js";
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
import { resetEncryptionKey } from "./core/auth/encryption.js";
import { providers, models as modelsTable } from "./db/schema/index.js";
import { eq } from "drizzle-orm";
import type { Model, Provider } from "@rel-ai/shared";
import { RequestLogger } from "./core/logging/logger.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface StartServerOptions {
  port?: number;
  dbPath?: string;
}

export interface StartedServer {
  url: string;
  stop: () => void;
  db: DbClient;
}

export async function startServer(opts?: StartServerOptions): Promise<StartedServer> {
  const port = opts?.port ?? Number(process.env.PORT || 3000);
  const db = opts?.dbPath === ":memory:"
    ? createMemoryDb()
    : createDb(opts?.dbPath);

  migrate(db, { migrationsFolder: path.join(__dirname, "db/migrations") });
  await migratePlaintextApiKeys(db);

  const createContext = createContextFactory(db);

  // Initialize adapter registry
  const registry = new AdapterRegistry();
  registry.register(new OpenAIAdapter());
  registry.register(new AnthropicAdapter());
  // "custom" providers use the OpenAI-compatible protocol
  const customAdapter = new OpenAIAdapter();
  (customAdapter as { type: string }).type = "custom";
  registry.register(customAdapter as any);

  // Build model lookup from DB
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

  // Build provider lookup from DB
  function getProviderFromDb(id: string): Provider | undefined {
    const row = db.select().from(providers).where(eq(providers.id, id)).get();
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      adapterType: row.adapterType as "openai" | "anthropic" | "custom",
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      enabled: row.enabled,
      config: row.config ? JSON.parse(row.config) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // Async credential lookup
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

  // Serve static frontend files
  const publicDir = path.join(__dirname, "../public");
  app.use("/*", serveStatic({ root: publicDir }));

  // SPA fallback
  app.get("*", serveStatic({ root: publicDir, path: "index.html" }));

  const server = Bun.serve({ fetch: app.fetch, port });

  return {
    url: `http://localhost:${port}`,
    stop: () => server.stop(),
    db,
  };
}
