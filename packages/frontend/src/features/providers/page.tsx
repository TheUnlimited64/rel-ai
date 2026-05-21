import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProviders } from "./hooks/useProviders";
import { ProviderTable } from "./components/ProviderTable";
import { ProviderForm } from "./components/ProviderForm";

export function ProvidersPage() {
  const { providers, loading, error, reload, toggleEnabled, remove } = useProviders();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError(null);
    try { await remove(deleteId); } catch { setDeleteError("Failed to delete provider"); }
    setDeleteId(null);
  }

  function handleCreateSuccess(providerId: string) {
    setShowCreate(false);
    reload();
    navigate(`/providers/${providerId}`);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Providers</h1>
        <Button onClick={() => setShowCreate(true)}>Add Provider</Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      <Card>
        <CardHeader><CardTitle>Configured Providers</CardTitle></CardHeader>
        <CardContent>
          <ProviderTable
            providers={providers}
            onToggle={toggleEnabled}
            onDelete={setDeleteId}
            onClickRow={(id) => navigate(`/providers/${id}`)}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Provider</DialogTitle></DialogHeader>
          <ProviderForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Provider</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will also delete all models using this provider. Are you sure?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
