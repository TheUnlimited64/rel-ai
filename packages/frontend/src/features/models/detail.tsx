import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { ModelDetailView } from "./ModelDetailView";
import { ModelEditForm } from "./ModelEditForm";
import { ModelResolutionTest } from "./ModelResolutionTest";
import { ModelDeleteDialog } from "./components/ModelDeleteDialog";
import { parseDependents } from "./useModels";

type UpdateModelInput = Parameters<typeof trpcHooks.models.update.useMutation>[0] & Record<string, unknown>;

export function ModelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteDependents, setDeleteDependents] = useState<string[] | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const modelQuery = trpcHooks.models.get.useQuery({ id: id! }, { enabled: !!id });
  const utils = trpcHooks.useUtils();
  const model = modelQuery.data;
  const loading = modelQuery.isLoading;

  const updateMutation = trpcHooks.models.update.useMutation({
    onSuccess: async () => {
      await utils.models.get.invalidate({ id });
      await utils.models.list.invalidate();
    },
  });

  const deleteMutation = trpcHooks.models.delete.useMutation({
    onSuccess: async () => {
      navigate("/models");
    },
    onError: (err) => {
      const dependents = parseDependents(err);
      if (dependents) {
        setDeleteDependents(dependents);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setDeleteError(msg);
      }
    },
  });

  async function handleSave(input: UpdateModelInput) {
    await updateMutation.mutateAsync(input as Parameters<typeof updateMutation.mutate>[0]);
    setEditing(false);
  }

  function handleDelete() {
    if (!id) return;
    deleteMutation.mutate({ id });
  }

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>;
  }

  if (!model) {
    return <p className="text-destructive">Model not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/models")}>← Back</Button>
        <h1 className="text-2xl font-bold">{model.displayName || model.id}</h1>
        {model.type === "real" ? (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Real</Badge>
        ) : (
          <div className="flex items-center gap-1">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Virtual</Badge>
            <Badge variant="outline">{model.variant === "fallback" ? "Fallback" : "Tuned"}</Badge>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <div className="flex gap-2">
            <ModelResolutionTest modelId={model.id} />
            {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <ModelEditForm
              model={model}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <ModelDetailView model={model} onDelete={() => setShowDelete(true)} />
          )}
        </CardContent>
      </Card>

      <ModelDeleteDialog
        open={showDelete}
        onOpenChange={(open) => { setShowDelete(open); if (!open) { setDeleteDependents(null); setDeleteError(null); } }}
        dependents={deleteDependents}
        errorMessage={deleteError}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
