export { startServer, createApp } from "./server.js";

import { createApp } from "./server.js";
import { createMemoryDb } from "./db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = createMemoryDb();
migrate(db, { migrationsFolder: path.join(__dirname, "db/migrations") });
export const app = createApp(db);

if (import.meta.main) {
  const { startServer } = await import("./server.js");
  await startServer();
}
