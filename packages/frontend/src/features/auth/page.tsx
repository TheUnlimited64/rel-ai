import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import { TokenTable } from "./components/TokenTable";
import { CreateTokenDialog } from "./components/CreateTokenDialog";
import { TokenRevealDialog } from "./components/TokenRevealDialog";
import { DeleteTokenDialog } from "./components/DeleteTokenDialog";
import type { CreateTokenResponse } from "./api";

export function TokensPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<CreateTokenResponse | null>(null);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const tokensQuery = trpcHooks.auth.listTokens.useQuery();
  const utils = trpcHooks.useUtils();
  const tokens = tokensQuery.data ?? [];
  const loading = tokensQuery.isLoading;
  const error = tokensQuery.error?.message ?? null;

  const createMutation = trpcHooks.auth.createToken.useMutation({
    onSuccess: async (result) => {
      setNewToken(result);
      setShowCreate(false);
      await utils.auth.listTokens.invalidate();
    },
    onError: (err) => {
      setMutationError(formatMutationError(err));
    },
  });

  const deleteMutation = trpcHooks.auth.deleteToken.useMutation({
    onSuccess: async () => {
      setDeleteId(null);
      await utils.auth.listTokens.invalidate();
    },
    onError: (err) => {
      setMutationError(formatMutationError(err));
    },
  });

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

      {mutationError && (
        <p className="text-sm text-destructive" role="alert">{mutationError}</p>
      )}

      <Card>
        <CardHeader><CardTitle>Admin Access Tokens</CardTitle></CardHeader>
        <CardContent>
          <TokenTable tokens={tokens} onDelete={setDeleteId} />
        </CardContent>
      </Card>

      <CreateTokenDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={(name) => createMutation.mutate({ name })}
        isPending={createMutation.isPending}
        onSuccess={() => { setShowCreate(false); }}
      />

      <TokenRevealDialog
        token={newToken}
        onClose={() => { setNewToken(null); setShowCreate(false); }}
      />

      <DeleteTokenDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
