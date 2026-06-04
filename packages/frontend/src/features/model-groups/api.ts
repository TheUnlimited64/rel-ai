import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@rel-ai/backend";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ModelGroupListItem = RouterOutputs["modelGroups"]["list"][number];
export type ModelGroupDetail = RouterOutputs["modelGroups"]["get"];
export type GroupEntry = ModelGroupDetail["entries"][number];
