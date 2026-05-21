import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@rel-ai/backend";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type LogEntry = RouterOutputs["logs"]["list"]["items"][number];
export type PaginatedLogs = RouterOutputs["logs"]["list"];
export type StatsData = RouterOutputs["logs"]["stats"];

export type LogFilters = {
  endpointId?: string;
  providerId?: string;
  status?: "success" | "error" | "rate_limited";
  from?: string;
  to?: string;
};
