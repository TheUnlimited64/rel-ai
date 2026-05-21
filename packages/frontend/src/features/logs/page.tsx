import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import type { LogEntry, StatsData, PaginatedLogs } from "./api";
import { StatsCards } from "./components/StatsCards";

const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 10_000;

type DatePreset = "1h" | "24h" | "7d" | "30d" | "all";

function presetToDate(preset: DatePreset): string | undefined {
  if (preset === "all") return undefined;
  const now = new Date();
  const map: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
  now.setHours(now.getHours() - map[preset]!);
  return now.toISOString();
}

export function LogsPage() {
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("24h");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const from = presetToDate(datePreset);
  const filters = {
    status: statusFilter === "all" ? undefined : statusFilter as "success" | "error" | "rate_limited",
    from,
  };

  const logsQuery = trpcHooks.logs.list.useQuery<PaginatedLogs>({
    ...filters,
    limit: PAGE_SIZE,
    offset,
  }, {
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  const statsQuery = trpcHooks.logs.stats.useQuery<StatsData>({ from }, {
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const stats = statsQuery.data ?? null;
  const loading = logsQuery.isLoading && logs.length === 0;
  const error = logsQuery.error?.message ?? null;
  const utils = trpcHooks.useUtils();

  const clearMutation = trpcHooks.logs.clear.useMutation({
    onSuccess: async () => {
      await utils.logs.list.invalidate();
      await utils.logs.stats.invalidate();
    },
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function handleClear() {
    if (!confirm("Clear all old logs?")) return;
    clearMutation.mutate({});
  }

  function statusBadge(status: string) {
    const map: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      success: "default",
      error: "destructive",
      rate_limited: "secondary",
    };
    return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Request Logs</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear} disabled={clearMutation.isPending}>Clear Old</Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {stats && <StatsCards stats={stats} />}

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Date Range</Label>
          <Select value={datePreset} onValueChange={(v) => { setDatePreset(v as DatePreset); setOffset(0); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setOffset(0); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="rate_limited">Rate Limited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log table */}
      <Card>
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  statusBadge={statusBadge}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(0)}>First</Button>
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Prev</Button>
            <span className="flex items-center px-2 text-sm">Page {currentPage}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset((totalPages - 1) * PAGE_SIZE)}>Last</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
  statusBadge,
}: {
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
  statusBadge: (s: string) => React.ReactNode;
}) {
  const tokens = (log.promptTokens ?? 0) + (log.completionTokens ?? 0);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="text-xs text-muted-foreground">
          {new Date(log.createdAt).toLocaleString()}
        </TableCell>
        <TableCell className="text-xs">{log.endpointId?.slice(0, 8) ?? "—"}</TableCell>
        <TableCell className="text-xs font-medium">{log.requestedModel}</TableCell>
        <TableCell className="text-xs">{log.providerId?.slice(0, 8) ?? "—"}</TableCell>
        <TableCell className="text-xs">{tokens > 0 ? tokens : "—"}</TableCell>
        <TableCell className="text-xs">{log.latencyMs != null ? `${log.latencyMs}ms` : "—"}</TableCell>
        <TableCell>{statusBadge(log.status)}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/50">
            <div className="space-y-1 text-xs">
              <div><span className="font-medium">ID:</span> {log.id}</div>
              <div><span className="font-medium">Resolved Model:</span> {log.resolvedModel ?? "—"}</div>
              <div><span className="font-medium">Prompt Tokens:</span> {log.promptTokens ?? 0}</div>
              <div><span className="font-medium">Completion Tokens:</span> {log.completionTokens ?? 0}</div>
              {log.errorDetail && (
                <div className="rounded bg-destructive/10 p-2">
                  <span className="font-medium text-destructive">Error:</span> {log.errorDetail}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
