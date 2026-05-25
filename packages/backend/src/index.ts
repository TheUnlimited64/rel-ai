export { startServer, createApp } from "./server.js";

import { createApp } from "./server.js";
import { createMemoryDb } from "./db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DbClient } from "./db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _app: ReturnType<typeof createApp> | null = null;
let _db: DbClient | null = null;

/**
 * Explicitly initialize the application (DB + migrations + Hono app).
 * Must be called before accessing `app` or `db`.
 */
export function initializeApp(): { app: ReturnType<typeof createApp>; db: DbClient } {
  if (_app && _db) return { app: _app, db: _db };

  _db = createMemoryDb();
  migrate(_db, { migrationsFolder: path.join(__dirname, "db/migrations") });
  _app = createApp(_db);
  return { app: _app, db: _db };
}

/**
 * Get the initialized app. Throws if initializeApp() hasn't been called.
 */
export function getApp(): ReturnType<typeof createApp> {
  if (!_app) throw new Error("App not initialized. Call initializeApp() first.");
  return _app;
}

/**
 * Get the initialized DB. Throws if initializeApp() hasn't been called.
 */
export function getDb(): DbClient {
  if (!_db) throw new Error("DB not initialized. Call initializeApp() first.");
  return _db;
}

if (import.meta.main) {
  initializeApp();
  const { startServer } = await import("./server.js");
  await startServer();
}
