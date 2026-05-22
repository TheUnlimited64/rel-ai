import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/QueryError";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { StatsCards } from "./components/StatsCards";
import { LogTable } from "./components/LogTable";
import { LogFilters, presetToDate, type DatePreset } from "./components/LogFilters";
import { StatsByProvider } from "./components/StatsByProvider";
import { StatsByModel } from "./components/StatsByModel";
import { Pagination } from "./components/Pagination";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { ClearDialog } from "./components/ClearDialog";

const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 10_000;
const STATUS_VALUES = ["success", "error", "rate_limited"] as const;

export function LogsPage() {
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("24h");
  const [endpointId, setEndpointId] = useState("all");
  const [providerId, setProviderId] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const from = presetToDate(datePreset);
  const status = statusFilter === "all" ? undefined : STATUS_VALUES.find(v => v === statusFilter);
  const filters = { status, endpointId: endpointId === "all" ? undefined : endpointId, providerId: providerId === "all" ? undefined : providerId, from };

  const logsQuery = trpcHooks.logs.list.useQuery(
    { ...filters, limit: PAGE_SIZE, offset },
    { refetchInterval: autoRefresh ? REFRESH_INTERVAL : false },
  );

  const statsQuery = trpcHooks.logs.stats.useQuery(filters, {
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const stats = statsQuery.data ?? null;
  const utils = trpcHooks.useUtils();

  const clearMutation = trpcHooks.logs.clear.useMutation({
    onSuccess: async () => { await utils.logs.list.invalidate(); await utils.logs.stats.invalidate(); setClearError(null); },
    onError: (err) => { setClearError(err.message); },
  });

  function resetOffset() { setOffset(0); setExpandedId(null); }

  if (logsQuery.isLoading && logs.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Request Logs</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowClearDialog(true)} disabled={clearMutation.isPending}>Clear Old</Button>
          {clearError && <p className="text-xs text-destructive">{clearError}</p>}
        </div>
      </div>

      <QueryError error={logsQuery.error} />
      {stats && <StatsCards stats={stats} />}

      <LogFilters
        datePreset={datePreset} statusFilter={statusFilter} endpointId={endpointId} providerId={providerId}
        onDatePresetChange={(v) => { setDatePreset(v); resetOffset(); }}
        onStatusChange={(v) => { setStatusFilter(v); resetOffset(); }}
        onEndpointChange={(v) => { setEndpointId(v); resetOffset(); }}
        onProviderChange={(v) => { setProviderId(v); resetOffset(); }}
      />

      <Card>
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <CardContent>
          <LogTable logs={logs} expandedId={expandedId}
            onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)} />
        </CardContent>
      </Card>

      {stats && <StatsByProvider data={stats.byProvider} />}
      {stats && <StatsByModel data={stats.byModel} />}
      <Pagination offset={offset} total={total} pageSize={PAGE_SIZE} onOffsetChange={setOffset} />

      <ClearDialog
        open={showClearDialog} onOpenChange={setShowClearDialog} isPending={clearMutation.isPending}
        onConfirm={() => { clearMutation.mutate({}); setShowClearDialog(false); }}
      />
    </div>
  );
}
