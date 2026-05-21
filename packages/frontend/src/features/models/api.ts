import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@rel-ai/backend";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ModelResponse = RouterOutputs["models"]["get"];
export type ModelListResponse = RouterOutputs["models"]["list"][number];
