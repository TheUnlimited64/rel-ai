import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/QueryError";
import { useModelGroups } from "./useModelGroups";
import { GroupTable } from "./components/GroupTable";
import { GroupForm } from "./components/GroupForm";

export function ModelGroupsPage() {
  const { groups, loading, error, reload, remove, deleteMutation } = useModelGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!deleteId) return;
    const err = await remove(deleteId);
    if (err) {
      setDeleteError(err);
    } else {
      setDeleteId(null);
      setDeleteError(null);
    }
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
        <h1 className="text-2xl font-bold">Model Groups</h1>
        <Button onClick={() => setShowCreate(true)}>New Group</Button>
      </div>
      <QueryError error={error} />
      <Card>
        <CardHeader>
          <CardTitle>Configured Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupTable groups={groups} onDelete={setDeleteId} onClickRow={(id) => navigate(`/model-groups/${id}`)} />
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Model Group</DialogTitle>
            <DialogDescription>
              Create a group of virtual model names. Add it to an endpoint to expose its mapped models.
            </DialogDescription>
          </DialogHeader>
          <GroupForm onSuccess={() => { setShowCreate(false); reload(); }} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              This removes the group and all its entries. Endpoints using this group lose access to its models.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure?</p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
