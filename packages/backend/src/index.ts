import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./api/router.js";
import { createContextFactory } from "./api/context.js";
import { VERSION } from "@rel-ai/shared";
import { createDb } from "./db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const db = createDb();
migrate(db, { migrationsFolder: "./src/db/migrations" });

const createContext = createContextFactory(db);

const app = new Hono();

app.use("/api/trpc/*", trpcServer({ router: appRouter, createContext }));

app.get("/health", (c) => c.json({ status: "ok", version: VERSION }));

export function getBackendVersion(): string {
  return VERSION;
}

export { app, appRouter, db };
export type { AppRouter } from "./api/router.js";
