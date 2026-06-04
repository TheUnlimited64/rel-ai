import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./api/router.js";
import { createContextFactory } from "./api/context.js";
import { VERSION } from "@rel-ai/shared";
import { createDb, createMemoryDb } from "./db/connection.js";
import type { DbClient } from "./db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createProxyRouter } from "./routes/proxy.js";
import { createAuthRoutes } from "./api/routes/auth.js";
import { ProxyHandler } from "./core/proxy/handler.js";
import type { ProviderCredentials } from "./core/proxy/handler.js";
import { ModelResolver } from "./core/model/resolver.js";
import { AdapterRegistry } from "./core/provider/registry.js";
import { migratePlaintextApiKeys } from "./core/provider/migrate.js";
import { OpenAIAdapter } from "./adapters/openai/adapter.js";
import { AnthropicAdapter } from "./adapters/anthropic/adapter.js";
import { CommandCodeAdapter } from "./adapters/commandcode/adapter.js";
import { PassthroughAdapter } from "./adapters/custom/index.js";
import { generateToken, maskToken } from "./core/auth/token.js";
import { decrypt } from "./core/auth/encryption.js";
import { authTokens } from "./db/schema/auth_tokens.js";
import { providers, models as modelsTable } from "./db/schema/index.js";
import { eq, count } from "drizzle-orm";
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
  triggerShutdown: (signal: string) => Promise<void>;
  readonly activeConnections: number;
  readonly shuttingDown: boolean;
  db: DbClient;
}

export function createApp(db: DbClient): Hono {
  // Initialize adapter registry
  const registry = new AdapterRegistry();
  registry.register(new OpenAIAdapter());
  registry.register(new AnthropicAdapter());
  registry.register(new CommandCodeAdapter());
  registry.register(new PassthroughAdapter());

  const createContext = createContextFactory(db, registry);

  // Build model lookup from DB
  function getModelFromDb(id: string): Model | undefined {
    const row = db.select().from(modelsTable).where(eq(modelsTable.id, id)).get();
    if (!row) return undefined;

    if (row.type === "real") {
      return {
        id: row.id,
        displayName: row.displayName,
        providerId: row.providerId ?? "",
        providerModel: row.providerModel ?? "",
        type: "real",
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    }

    return {
      id: row.id,
      displayName: row.displayName,
      type: "virtual",
      variant: (row.variant as "fallback" | "tuned" | undefined) ?? "fallback",
      fallbackChain: row.fallbackChain ? (JSON.parse(row.fallbackChain) as string[]) : undefined,
      baseModelId: row.baseModelId ?? undefined,
      overrides: row.overrides ? (JSON.parse(row.overrides) as Record<string, unknown>) : undefined,
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
      adapterType: row.adapterType as "openai" | "anthropic" | "custom" | "commandcode",
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      enabled: row.enabled,
      config: row.config ? (JSON.parse(row.config) as Record<string, unknown>) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // Async credential lookup
  async function getProviderCredentials(providerId: string): Promise<ProviderCredentials | null> {
    const provider = getProviderFromDb(providerId);
    if (!provider || !provider.apiKey) return null;

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
    onLog: (log) => { requestLogger.logFromProxy(log); },
  });

  const app = new Hono();

  // CORS for admin API: restrict to same-origin or explicit allowlist
  const adminOrigins = process.env.CORS_ORIGINS ?? "";
  app.use("/api/trpc/*", cors({
    origin: adminOrigins ? adminOrigins.split(",").map((o) => o.trim()) : "",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));

  app.use("/api/trpc/*", trpcServer({ router: appRouter, createContext }));

  // CORS for proxy routes: allow all origins (API consumers need cross-origin access)
  app.use("/v1/*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));

  app.get("/health", (c) => c.json({ status: "ok", version: VERSION }));

  // Session-based auth routes (login/logout/me)
  app.route("/api/auth", createAuthRoutes());

  // Mount proxy routes
  const proxyRouter = createProxyRouter(db, proxyHandler);
  app.route("/v1", proxyRouter);

  // Serve static frontend files
  const publicDir = path.join(__dirname, "../public");
  app.use("/*", serveStatic({ root: publicDir }));

  // SPA fallback
  app.get("*", serveStatic({ root: publicDir, path: "index.html" }));

  return app;
}

export async function startServer(opts?: StartServerOptions): Promise<StartedServer> {
  const port = opts?.port ?? Number(process.env.PORT || 3000);
  const db = opts?.dbPath === ":memory:"
    ? createMemoryDb()
    : createDb(opts?.dbPath);

  migrate(db, { migrationsFolder: path.join(__dirname, "db/migrations") });
  await migratePlaintextApiKeys(db);

  // First-run: auto-create admin token if none exist (atomic via transaction)
  const tokenRows = db.select({ count: count() }).from(authTokens).all();
  if (tokenRows[0]?.count === 0) {
    const { token, hash } = await generateToken();
    db.transaction((tx) => {
      const row = tx.select({ count: count() }).from(authTokens).get();
      if (row && row.count === 0) {
        const id = crypto.randomUUID();
        tx.insert(authTokens).values({ id, name: "Initial Admin Token", tokenHash: hash }).run();
        console.log(`\n🔑 First-run admin token created: ${maskToken(token)}\n`);
      }
    });
  }

  // Production ENCRYPTION_KEY warning (backup — encryption.ts throws on first use if missing)
  if (process.env.NODE_ENV === "production" && !process.env.ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY_FILE) {
    console.warn("⚠️ Running in production without ENCRYPTION_KEY or ENCRYPTION_KEY_FILE. Server will fail on first encryption/decryption attempt.");
  }

  const app = createApp(db);

  // Graceful shutdown state
  let shuttingDown = false;
  let activeConnections = 0;
  const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000;

  const wrappedFetch: typeof app.fetch = (req, env, ctx) => {
    if (shuttingDown) {
      return new Response(JSON.stringify({ error: "Server is shutting down" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    activeConnections++;
    const result = app.fetch(req, env, ctx);
    // Handle both sync and async return values
    if (result instanceof Promise) {
      return result.finally(() => { activeConnections--; });
    }
    activeConnections--;
    return result;
  };

  const hostname = process.env.HOST || "127.0.0.1";
  const server = Bun.serve({ fetch: wrappedFetch, port, hostname, idleTimeout: 255 });

  let shutdownStarted = false;
  async function gracefulShutdown(signal: string) {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    shuttingDown = true;

    // Wait for active connections to drain
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
    while (activeConnections > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (activeConnections > 0) {
      console.warn(`Shutdown timeout reached with ${String(activeConnections)} active connections remaining`);
    }

    void server.stop();
  }

  process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
  process.on("SIGINT", () => { void gracefulShutdown("SIGINT"); });

  return {
    url: `http://localhost:${String(port)}`,
    stop: () => { void server.stop(); },
    triggerShutdown: gracefulShutdown,
    get activeConnections() { return activeConnections; },
    get shuttingDown() { return shuttingDown; },
    db,
  };
}
