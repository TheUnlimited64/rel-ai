import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { TokenResponse } from "../api";

interface TokenTableProps {
  tokens: TokenResponse[];
  onDelete: (id: string) => void;
}

export function TokenTable({ tokens, onDelete }: TokenTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No tokens yet
            </TableCell>
          </TableRow>
        ) : (
          tokens.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : "Never"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
