import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./api/router.js";
import { createContext } from "./api/context.js";
import { VERSION } from "@rel-ai/shared";

const app = new Hono();

app.use("/api/trpc/*", trpcServer({ router: appRouter, createContext }));

app.get("/health", (c) => c.json({ status: "ok", version: VERSION }));

export function getBackendVersion(): string {
  return VERSION;
}

export { app, appRouter };
export type { AppRouter } from "./api/router.js";
