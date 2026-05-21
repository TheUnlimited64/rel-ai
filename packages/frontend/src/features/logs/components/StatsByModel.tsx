import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModelStat = { id: string; count: number; successRate: number; avgLatencyMs: number | null };

export function StatsByModel({ data }: { data: ModelStat[] }) {
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">By Model</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Avg Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs font-medium">{row.id}</TableCell>
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
