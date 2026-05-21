export type LogEntry = {
  id: string;
  endpointId: string | null;
  requestedModel: string;
  resolvedModel: string | null;
  providerId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  status: string;
  errorDetail: string | null;
  createdAt: string;
};

export type PaginatedLogs = {
  items: LogEntry[];
  total: number;
};

export type StatsData = {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number | null;
  totalTokens: number;
  byProvider: Array<{ id: string; count: number; successRate: number; avgLatencyMs: number | null }>;
  byModel: Array<{ id: string; count: number; successRate: number; avgLatencyMs: number | null }>;
};

export type LogFilters = {
  endpointId?: string;
  providerId?: string;
  status?: "success" | "error" | "rate_limited";
  from?: string;
  to?: string;
};
