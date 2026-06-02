import { useState } from "react";
import type { EndpointListResponse } from "../api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight, Check } from "lucide-react";

interface EndpointTableProps {
  endpoints: EndpointListResponse[];
  onToggle: (ep: EndpointListResponse) => void;
  toggleIsPending: boolean;
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

export function EndpointTable({ endpoints, onToggle, toggleIsPending, onDelete, onClickRow }: EndpointTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyUrl(ep: EndpointListResponse) {
    navigator.clipboard.writeText(`${ep.proxyBase}/${ep.path}/chat/completions`);
    setCopiedId(ep.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <ArrowLeftRight className="h-8 w-8 text-muted-foreground/25" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No endpoints configured</p>
          <p className="text-xs text-muted-foreground/60">Add an endpoint to expose models to clients</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Path</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Models</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Enabled</TableHead>
          <TableHead className="text-right text-xs uppercase tracking-wider">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {endpoints.map((ep) => (
          <TableRow key={ep.id} className="cursor-pointer" onClick={() => onClickRow(ep.id)}>
            <TableCell className="font-medium">{ep.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-mono">/{ep.path}</Badge>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{ep.modelCount}</TableCell>
            <TableCell>
              <Switch
                checked={ep.enabled}
                onCheckedChange={() => onToggle(ep)}
                disabled={toggleIsPending}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={copiedId === ep.id ? "text-emerald-400" : ""}
                  onClick={(e) => { e.stopPropagation(); copyUrl(ep); }}
                >
                  {copiedId === ep.id ? (
                    <><Check className="mr-1 h-3 w-3" />Copied</>
                  ) : (
                    "Copy URL"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(ep.id); }}
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
