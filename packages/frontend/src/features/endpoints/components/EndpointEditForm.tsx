import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EndpointModelManager } from "./EndpointModelManager";
import type { EndpointGetResponse, ModelListResponse } from "../api";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  path: z.string().min(1, "Path is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});
type EditFormValues = z.infer<typeof editSchema>;

interface EndpointEditFormProps {
  endpoint: EndpointGetResponse;
  allModels: ModelListResponse[];
  onSave: (data: { name: string; path: string; modelIds: string[] }) => Promise<string | undefined>;
  onCancel: () => void;
}

export function EndpointEditForm({ endpoint, allModels, onSave, onCancel }: EndpointEditFormProps) {
  const initIdRef = useRef<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set(endpoint.models.map((m) => m.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: endpoint.name, path: endpoint.path },
  });

  useEffect(() => {
    if (initIdRef.current !== endpoint.id) {
      initIdRef.current = endpoint.id;
      reset({ name: endpoint.name, path: endpoint.path });
      setSelectedModelIds(new Set(endpoint.models.map((m) => m.id)));
    }
  });

  function toggleModelId(mid: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid); else next.add(mid);
      return next;
    });
  }

  async function onSubmit(data: EditFormValues) {
    setSaving(true);
    setError(null);
    const errMsg = await onSave({ ...data, modelIds: Array.from(selectedModelIds) });
    if (errMsg) { setError(errMsg); setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ep-edit-name">Name</Label>
        <Input id="ep-edit-name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-edit-path">Path</Label>
        <Input id="ep-edit-path" {...register("path")} />
        {errors.path && <p className="text-xs text-destructive">{errors.path.message}</p>}
        {!errors.path && <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>}
      </div>
      <EndpointModelManager models={allModels} selectedModelIds={selectedModelIds} onToggle={toggleModelId} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
