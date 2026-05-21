import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEndpoints } from "./useEndpoints";
import { EndpointTable } from "./components/EndpointTable";
import { EndpointForm } from "./components/EndpointForm";
import type { EndpointCreateResponse } from "./api";

export function EndpointsPage() {
  const { endpoints, loading, error, reload, toggleEnabled, remove } = useEndpoints();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<EndpointCreateResponse | null>(null);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!deleteId) return;
    try { await remove(deleteId); } catch { /* already removed from state */ }
    setDeleteId(null);
  }

  function handleCreated(ep: EndpointCreateResponse) {
    setShowCreate(false);
    setCreatedEndpoint(ep);
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Configured Endpoints</CardTitle></CardHeader>
        <CardContent>
          <EndpointTable
            endpoints={endpoints}
            onToggle={toggleEnabled}
            onDelete={setDeleteId}
            onClickRow={(id) => navigate(`/endpoints/${id}`)}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Endpoint</DialogTitle></DialogHeader>
          <EndpointForm onSuccess={handleCreated} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Endpoint</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the endpoint and its model associations. Are you sure?
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createdEndpoint !== null} onOpenChange={() => { setCreatedEndpoint(null); reload(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Endpoint Created</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy the token below. <strong>This token will not be shown again.</strong>
          </p>
          <div className="flex items-center gap-2 rounded border bg-muted p-3">
            <code className="flex-1 break-all text-sm">{createdEndpoint?.token}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (createdEndpoint) navigator.clipboard.writeText(createdEndpoint.token);
              }}
            >
              Copy
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { setCreatedEndpoint(null); reload(); }}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
