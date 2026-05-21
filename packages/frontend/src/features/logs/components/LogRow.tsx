import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { LogEntry } from "../api";
import { StatusBadge } from "./StatusBadge";

export function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tokens = (log.promptTokens ?? 0) + (log.completionTokens ?? 0);

  return (
    <>
      <TableRow className="cursor-pointer" tabIndex={0} aria-expanded={expanded} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}>
        <TableCell className="text-xs text-muted-foreground">
          {new Date(log.createdAt).toLocaleString()}
        </TableCell>
        <TableCell className="text-xs">{log.endpointId?.slice(0, 8) ?? "—"}</TableCell>
        <TableCell className="text-xs font-medium">{log.requestedModel}</TableCell>
        <TableCell className="text-xs">{log.resolvedModel ?? "—"}</TableCell>
        <TableCell className="text-xs">{log.providerId?.slice(0, 8) ?? "—"}</TableCell>
        <TableCell className="text-xs">{tokens > 0 ? tokens : "—"}</TableCell>
        <TableCell className="text-xs">{log.latencyMs != null ? `${log.latencyMs}ms` : "—"}</TableCell>
        <TableCell><StatusBadge status={log.status} /></TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/50">
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
