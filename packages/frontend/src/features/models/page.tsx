import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/QueryError";
import { useModels, type ModelTypeFilter } from "./useModels";
import { ModelTable } from "./components/ModelTable";
import { CreateRealModelForm } from "./components/CreateRealModelForm";
import { CreateVirtualModelForm } from "./components/CreateVirtualModelForm";
import { ModelDeleteDialog } from "./components/ModelDeleteDialog";

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

      <QueryError error={error} />

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
          <DialogHeader>
            <DialogTitle>Add Real Model</DialogTitle>
            <DialogDescription>Create a new real model backed by a provider.</DialogDescription>
          </DialogHeader>
          <CreateRealModelForm onSuccess={() => { setShowCreateReal(false); reload(); }} onCancel={() => setShowCreateReal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateVirtual} onOpenChange={setShowCreateVirtual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Virtual Model</DialogTitle>
            <DialogDescription>Create a virtual model with fallback chain or tuned overrides.</DialogDescription>
          </DialogHeader>
          <CreateVirtualModelForm onSuccess={() => { setShowCreateVirtual(false); reload(); }} onCancel={() => setShowCreateVirtual(false)} />
        </DialogContent>
      </Dialog>

      <ModelDeleteDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}
        dependents={deleteDependents}
        onConfirm={handleDelete}
      />
    </div>
  );
}
