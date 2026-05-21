import type { ProviderResponse } from "../api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProviderTableProps {
  providers: ProviderResponse[];
  onToggle: (p: ProviderResponse) => void;
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

export function ProviderTable({ providers, onToggle, onDelete, onClickRow }: ProviderTableProps) {
  if (providers.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No providers configured. Add one to get started.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Base URL</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((p) => (
          <TableRow key={p.id} className="cursor-pointer" onClick={() => onClickRow(p.id)}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell><Badge variant="secondary">{p.adapterType}</Badge></TableCell>
            <TableCell className="max-w-[200px] truncate">{p.baseUrl}</TableCell>
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
