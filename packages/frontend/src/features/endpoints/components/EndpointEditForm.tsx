import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ENDPOINT_PATH_REGEX, ENDPOINT_PATH_MESSAGE } from "@rel-ai/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EndpointModelManager } from "./EndpointModelManager";
import { EndpointGroupManager } from "./EndpointGroupManager";
import type { EndpointGetResponse, ModelListResponse } from "../api";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  path: z.string().min(1, "Path is required").regex(ENDPOINT_PATH_REGEX, ENDPOINT_PATH_MESSAGE),
});
type EditFormValues = z.infer<typeof editSchema>;

interface EndpointEditFormProps {
  endpoint: EndpointGetResponse;
  allModels: ModelListResponse[];
  allGroups: { id: string; name: string }[];
  onSave: (data: { name: string; path: string; modelIds: string[]; groupIds: string[] }) => Promise<string | undefined>;
  onCancel: () => void;
}

export function EndpointEditForm({ endpoint, allModels, allGroups, onSave, onCancel }: EndpointEditFormProps) {
  const initIdRef = useRef<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set(endpoint.models.map((m) => m.id)),
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set((endpoint.groups ?? []).map((g) => g.id)),
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
      setSelectedGroupIds(new Set((endpoint.groups ?? []).map((g) => g.id)));
    }
  });

  function toggleModelId(mid: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid); else next.add(mid);
      return next;
    });
  }

  function toggleGroupId(gid: string) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  }

  async function onSubmit(data: EditFormValues) {
    setSaving(true);
    setError(null);
    const errMsg = await onSave({
      ...data,
      modelIds: Array.from(selectedModelIds),
      groupIds: Array.from(selectedGroupIds),
    });
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
      <EndpointGroupManager groups={allGroups} selectedGroupIds={selectedGroupIds} onToggle={toggleGroupId} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
