import type { ProviderResponse } from "../api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Server } from "lucide-react";

interface ProviderTableProps {
  providers: ProviderResponse[];
  onToggle: (p: ProviderResponse) => void;
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

export function ProviderTable({ providers, onToggle, onDelete, onClickRow }: ProviderTableProps) {
  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Server className="h-8 w-8 text-muted-foreground/25" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No providers configured</p>
          <p className="text-xs text-muted-foreground/60">Add a provider to connect to an LLM API</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Base URL</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Enabled</TableHead>
          <TableHead className="text-right text-xs uppercase tracking-wider">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((p) => (
          <TableRow key={p.id} className="cursor-pointer" onClick={() => onClickRow(p.id)}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell><Badge variant="secondary">{p.adapterType}</Badge></TableCell>
            <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
              {p.baseUrl}
            </TableCell>
            <TableCell>
              <Switch
                checked={p.enabled}
                onCheckedChange={() => onToggle(p)}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
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
