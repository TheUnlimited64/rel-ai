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
      <TableRow
        className="cursor-pointer"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      >
        <TableCell className="font-mono text-xs text-muted-foreground/70">
          {new Date(log.createdAt).toLocaleString()}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.endpointId?.slice(0, 8) ?? "—"}
        </TableCell>
        <TableCell className="text-xs font-medium">{log.requestedModel}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.resolvedModel ?? "—"}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.providerId?.slice(0, 8) ?? "—"}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {tokens > 0 ? tokens.toLocaleString() : "—"}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {log.latencyMs != null ? `${log.latencyMs}ms` : "—"}
        </TableCell>
        <TableCell><StatusBadge status={log.status} /></TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-0">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-xs sm:grid-cols-4">
              <div className="space-y-0.5">
                <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">ID</p>
                <p className="font-mono text-muted-foreground">{log.id}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Resolved Model</p>
                <p className="font-mono">{log.resolvedModel ?? "—"}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Prompt Tokens</p>
                <p className="font-mono">{(log.promptTokens ?? 0).toLocaleString()}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">Completion Tokens</p>
                <p className="font-mono">{(log.completionTokens ?? 0).toLocaleString()}</p>
              </div>
            </div>
            {log.errorDetail && (
              <div className="mx-4 mb-3 rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs">
                <span className="font-medium text-destructive">Error: </span>
                <span className="font-mono text-muted-foreground">{log.errorDetail}</span>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
