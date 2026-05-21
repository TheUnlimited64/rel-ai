import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModels, type ModelTypeFilter } from "./useModels";
import { ModelTable } from "./components/ModelTable";
import { CreateRealModelForm } from "./components/CreateRealModelForm";
import { CreateVirtualModelForm } from "./components/CreateVirtualModelForm";

export function ModelsPage() {
  const { models, loading, error, reload, remove, typeFilter, setTypeFilter } = useModels();
  const [showCreateReal, setShowCreateReal] = useState(false);
  const [showCreateVirtual, setShowCreateVirtual] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDependents, setDeleteDependents] = useState<string[] | null>(null);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!deleteId) return;
    const dependents = await remove(deleteId);
    if (dependents) {
      setDeleteDependents(dependents);
    } else {
      setDeleteId(null);
      setDeleteDependents(null);
    }
  }

  function closeDeleteDialog() {
    setDeleteId(null);
    setDeleteDependents(null);
  }

  const filterTabs: { value: ModelTypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "real", label: "Real" },
    { value: "virtual", label: "Virtual" },
  ];

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
        <h1 className="text-2xl font-bold">Models</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateReal(true)}>Add Real Model</Button>
          <Button onClick={() => setShowCreateVirtual(true)}>Add Virtual Model</Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={typeFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Configured Models</CardTitle></CardHeader>
        <CardContent>
          <ModelTable
            models={models}
            onDelete={setDeleteId}
            onClickRow={(id) => navigate(`/models/${id}`)}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreateReal} onOpenChange={setShowCreateReal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Real Model</DialogTitle></DialogHeader>
          <CreateRealModelForm onSuccess={() => { setShowCreateReal(false); reload(); }} onCancel={() => setShowCreateReal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateVirtual} onOpenChange={setShowCreateVirtual}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Virtual Model</DialogTitle></DialogHeader>
          <CreateVirtualModelForm onSuccess={() => { setShowCreateVirtual(false); reload(); }} onCancel={() => setShowCreateVirtual(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Model</DialogTitle></DialogHeader>
          {deleteDependents ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Cannot delete: this model is referenced by other models.</p>
              <p className="text-sm text-muted-foreground">Dependents: {deleteDependents.join(", ")}</p>
              <p className="text-sm text-muted-foreground">Remove references first, then try again.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this model?</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDeleteDialog}>
              {deleteDependents ? "Close" : "Cancel"}
            </Button>
            {!deleteDependents && (
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
