import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { providersRouter } from "./routers/providers.js";
import { endpointsRouter } from "./routers/endpoints.js";
import { modelsRouter } from "./routers/models.js";
import { logsRouter } from "./routers/logs.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  providers: providersRouter,
  endpoints: endpointsRouter,
  models: modelsRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;
