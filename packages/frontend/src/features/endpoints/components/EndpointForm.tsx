import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import { EndpointModelManager } from "./EndpointModelManager";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  path: z.string().min(1, "Path is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});
type FormValues = z.infer<typeof formSchema>;

interface EndpointFormProps {
  onSuccess: (created: { id: string; name: string; path: string; token: string; enabled: boolean; createdAt: string; updatedAt: string; proxyBase: string }) => void;
  onCancel: () => void;
  skipLabel?: string;
}

export function EndpointForm({ onSuccess, onCancel, skipLabel = "Cancel" }: EndpointFormProps) {
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const utils = trpcHooks.useUtils();
  const { data: models } = trpcHooks.models.list.useQuery();
  const createMutation = trpcHooks.endpoints.create.useMutation({
    onSuccess: async (result) => { await utils.endpoints.list.invalidate(); onSuccess(result); },
  });
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", path: "" },
  });

  function toggleModel(id: string) {
    setSelectedModelIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function onSubmit(data: FormValues) {
    createMutation.mutate({ ...data, modelIds: Array.from(selectedModelIds) });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ep-name">Name</Label>
        <Input id="ep-name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-path">Path</Label>
        <Input id="ep-path" {...register("path")} placeholder="my-endpoint" />
        {errors.path && <p className="text-xs text-destructive">{errors.path.message}</p>}
        {!errors.path && <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>}
      </div>
      <EndpointModelManager models={(models ?? []).map((m) => ({ id: m.id, displayName: m.displayName, type: m.type }))} selectedModelIds={selectedModelIds} onToggle={toggleModel} />
      {createMutation.error && (
        <p className="text-sm text-destructive">{formatMutationError(createMutation.error)}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{skipLabel}</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
