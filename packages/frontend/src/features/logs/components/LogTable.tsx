import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LogEntry } from "../api";
import { LogRow } from "./LogRow";

export function LogTable({
  logs,
  expandedId,
  onToggleExpand,
}: {
  logs: LogEntry[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Endpoint</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Resolved Model</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Tokens</TableHead>
          <TableHead>Latency</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              No logs found
            </TableCell>
          </TableRow>
        ) : logs.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            expanded={expandedId === log.id}
            onToggle={() => onToggleExpand(log.id)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
