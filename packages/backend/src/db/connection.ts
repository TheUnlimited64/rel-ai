import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema/index.js";
import path from "node:path";
import fs from "node:fs";

export type DbClient = ReturnType<typeof createDb>;

export function createDb(dbPath?: string) {
  const resolvedPath = dbPath ?? process.env.DATABASE_URL ?? "./data/rel-ai.db";

  // Ensure directory exists for file-based databases
  if (resolvedPath !== ":memory:") {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(resolvedPath);
  // Enable WAL mode and foreign keys
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

export function createMemoryDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
