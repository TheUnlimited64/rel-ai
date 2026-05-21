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

export function StatsByProvider({ data }: { data: ProviderStat[] }) {
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">By Provider</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider ID</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Avg Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={row.id || `unassigned-${i}`}>
                <TableCell className="text-xs">{!row.id || row.id === "undefined" ? "(unassigned)" : row.id.slice(0, 8)}</TableCell>
                <TableCell className="text-xs">{row.count}</TableCell>
                <TableCell className="text-xs">{Math.round(row.successRate * 100)}%</TableCell>
                <TableCell className="text-xs">{row.avgLatencyMs != null ? `${row.avgLatencyMs}ms` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
