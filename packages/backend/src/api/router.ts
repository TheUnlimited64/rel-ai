import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { providersRouter } from "./routers/providers.js";
import { endpointsRouter } from "./routers/endpoints.js";
import { modelsRouter } from "./routers/models.js";
import { logsRouter } from "./routers/logs.js";
import { modelGroupsRouter } from "./routers/model_groups.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  providers: providersRouter,
  endpoints: endpointsRouter,
  models: modelsRouter,
  logs: logsRouter,
  modelGroups: modelGroupsRouter,
});

export type AppRouter = typeof appRouter;
