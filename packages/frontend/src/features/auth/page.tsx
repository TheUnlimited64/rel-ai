import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchTokens, createToken, deleteToken, type TokenResponse, type CreateTokenResponse } from "./api";

export function TokensPage() {
  const [tokens, setTokens] = useState<TokenResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<CreateTokenResponse | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setTokens(await fetchTokens());
    } catch {
      setError("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }

  useState(() => { load(); });

  async function handleCreate(name: string) {
    const result = await createToken(name);
    setNewToken(result);
    await load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteToken(deleteId);
    } catch { /* ignore */ }
    setDeleteId(null);
    await load();
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auth Tokens</h1>
        <Button onClick={() => { setNewToken(null); setShowCreate(true); }}>
          Create Token
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Admin Access Tokens</CardTitle></CardHeader>
        <CardContent>
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
              ) : tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateTokenDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleCreate}
      />

      <TokenRevealDialog
        token={newToken}
        onCopy={copyToken}
        onClose={() => { setNewToken(null); setShowCreate(false); }}
      />

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Token</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Any clients using this token will immediately lose access. Are you sure?
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTokenDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(name.trim());
      setName("");
      onOpenChange(false);
    } catch {
      setError("Failed to create token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Token</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              placeholder='e.g., "my-laptop", "phone"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || submitting}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TokenRevealDialog({
  token,
  onCopy,
  onClose,
}: {
  token: CreateTokenResponse | null;
  onCopy: (v: string) => void;
  onClose: () => void;
}) {
  if (!token) return null;

  return (
    <Dialog open={token !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Token Created</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              This token will not be shown again
            </p>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <p className="text-sm">{token.name}</p>
          </div>
          <div className="space-y-2">
            <Label>Token</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-xs font-mono break-all">
                {token.token}
              </code>
              <Button size="sm" variant="outline" onClick={() => onCopy(token.token)}>
                Copy
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
