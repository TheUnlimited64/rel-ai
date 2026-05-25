import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/QueryError";
import { useEndpoints } from "./hooks/useEndpoints";
import { EndpointTable } from "./components/EndpointTable";
import { EndpointForm } from "./components/EndpointForm";
import { EndpointTokenRevealDialog } from "./components/EndpointTokenRevealDialog";
import type { EndpointCreateResponse } from "./api";

export function EndpointsPage() {
  const { endpoints, loading, error, reload, toggleEnabled, toggleIsPending, remove, deleteMutation } = useEndpoints();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<EndpointCreateResponse | null>(null);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!deleteId) return;
    try { await remove(deleteId); } catch { /* deleteMutation error surfaces via UI below */ }
    setDeleteId(null);
  }

  function handleCreated(ep: EndpointCreateResponse) {
    setShowCreate(false);
    setCreatedEndpoint(ep);
  }

  function handleTokenDone() {
    const epId = createdEndpoint?.id;
    setCreatedEndpoint(null);
    reload();
    if (epId) navigate(`/endpoints/${epId}`);
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
        <h1 className="text-2xl font-bold">Endpoints</h1>
        <Button onClick={() => setShowCreate(true)}>Add Endpoint</Button>
      </div>
      <QueryError error={error} />
      <Card>
        <CardHeader><CardTitle>Configured Endpoints</CardTitle></CardHeader>
        <CardContent>
          <EndpointTable endpoints={endpoints} onToggle={toggleEnabled} toggleIsPending={toggleIsPending} onDelete={setDeleteId} onClickRow={(id) => navigate(`/endpoints/${id}`)} />
        </CardContent>
      </Card>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Endpoint</DialogTitle></DialogHeader>
          <DialogDescription>Create a new endpoint to proxy requests to selected models.</DialogDescription>
          <EndpointForm onSuccess={handleCreated} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Endpoint</DialogTitle></DialogHeader>
          <DialogDescription>This will remove the endpoint and its model associations.</DialogDescription>
          <p className="text-sm text-muted-foreground">
            Are you sure?
          </p>
          {deleteMutation.error && <p className="text-sm text-destructive">{deleteMutation.error.message}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      <EndpointTokenRevealDialog open={createdEndpoint !== null} token={createdEndpoint?.token ?? ""} onClose={handleTokenDone} />
    </div>
  );
}
