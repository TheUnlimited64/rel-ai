import type { EndpointListResponse } from "../api";
import { getProxyBase } from "../api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EndpointTableProps {
  endpoints: EndpointListResponse[];
  onToggle: (ep: EndpointListResponse) => void;
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

function copyUrl(path: string) {
  navigator.clipboard.writeText(`${getProxyBase()}/${path}/chat/completions`);
}

export function EndpointTable({ endpoints, onToggle, onDelete, onClickRow }: EndpointTableProps) {
  if (endpoints.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No endpoints configured. Add one to get started.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Models</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {endpoints.map((ep) => (
          <TableRow key={ep.id} className="cursor-pointer" onClick={() => onClickRow(ep.id)}>
            <TableCell className="font-medium">{ep.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-mono">/{ep.path}</Badge>
            </TableCell>
            <TableCell>{ep.modelCount}</TableCell>
            <TableCell>
              <Switch
                checked={ep.enabled}
                onCheckedChange={() => onToggle(ep)}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); copyUrl(ep.path); }}
                >
                  Copy URL
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
