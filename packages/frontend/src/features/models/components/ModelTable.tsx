import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ModelResponse } from "../api";
import { Layers } from "lucide-react";

interface ModelTableProps {
  models: ModelResponse[];
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

function variantBadge(model: ModelResponse) {
  if (model.type === "real") return null;
  const label = model.variant === "fallback" ? "Fallback" : "Tuned";
  return <Badge variant="outline">{label}</Badge>;
}

export function ModelTable({ models, onDelete, onClickRow }: ModelTableProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/25" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No models configured</p>
          <p className="text-xs text-muted-foreground/60">Add a model to route requests to your providers</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase tracking-wider">ID</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Display Name</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Variant</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Provider Model</TableHead>
          <TableHead className="text-right text-xs uppercase tracking-wider">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={m.id} className="cursor-pointer" onClick={() => onClickRow(m.id)}>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {m.id.length > 8 ? `${m.id.slice(0, 8)}…` : m.id}
            </TableCell>
            <TableCell className="font-medium">{m.displayName || m.id}</TableCell>
            <TableCell>
              {m.type === "real" ? (
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/25">Real</Badge>
              ) : (
                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/25">Virtual</Badge>
              )}
            </TableCell>
            <TableCell>{variantBadge(m)}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {m.type === "real" ? m.providerModel : "—"}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
