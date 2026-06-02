import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";

export type DatePreset = "1h" | "24h" | "7d" | "30d" | "all";

export function presetToDate(preset: DatePreset): string | undefined {
  if (preset === "all") return undefined;
  const now = new Date();
  const map: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
  now.setHours(now.getHours() - map[preset]!);
  return now.toISOString();
}

export function LogFilters({
  datePreset,
  statusFilter,
  endpointId,
  providerId,
  onDatePresetChange,
  onStatusChange,
  onEndpointChange,
  onProviderChange,
}: {
  datePreset: DatePreset;
  statusFilter: string;
  endpointId: string;
  providerId: string;
  onDatePresetChange: (v: DatePreset) => void;
  onStatusChange: (v: string) => void;
  onEndpointChange: (v: string) => void;
  onProviderChange: (v: string) => void;
}) {
  const { data: endpoints } = trpcHooks.endpoints.list.useQuery();
  const { data: providers } = trpcHooks.providers.list.useQuery();

  return (
    <div className="flex items-end gap-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Date Range</Label>
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
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
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Status</Label>
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="rate_limited">Rate Limited</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Endpoint</Label>
        <Select value={endpointId} onValueChange={(v) => onEndpointChange(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {endpoints?.map((ep) => (
              <SelectItem key={ep.id} value={ep.id}>{ep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Provider</Label>
        <Select value={providerId} onValueChange={(v) => onProviderChange(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {providers?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
