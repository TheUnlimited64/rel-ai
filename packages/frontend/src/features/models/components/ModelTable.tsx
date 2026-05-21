import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ModelResponse } from "../api";

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
    return <p className="py-8 text-center text-muted-foreground">No models configured. Add one to get started.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Display Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Variant</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={m.id} className="cursor-pointer" onClick={() => onClickRow(m.id)}>
            <TableCell className="font-mono text-xs">{m.id.length > 8 ? `${m.id.slice(0, 8)}…` : m.id}</TableCell>
            <TableCell className="font-medium">{m.displayName || m.id}</TableCell>
            <TableCell>
              {m.type === "real" ? (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Real</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Virtual</Badge>
              )}
            </TableCell>
            <TableCell>{variantBadge(m)}</TableCell>
            <TableCell className="text-muted-foreground">
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
