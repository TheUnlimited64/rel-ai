import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProviderStat = { id: string; count: number; successRate: number; avgLatencyMs: number | null };

function rateColor(rate: number) {
  if (rate >= 0.95) return "text-emerald-400";
  if (rate >= 0.8) return "text-amber-400";
  return "text-destructive";
}

export function StatsByProvider({ data }: { data: ProviderStat[] }) {
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">By Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Requests</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Success Rate</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Avg Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={row.id || `unassigned-${i}`}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {!row.id || row.id === "undefined" ? "(unassigned)" : row.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.count.toLocaleString()}</TableCell>
                <TableCell className={`font-mono text-xs font-medium ${rateColor(row.successRate)}`}>
                  {Math.round(row.successRate * 100)}%
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.avgLatencyMs != null ? `${row.avgLatencyMs}ms` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
