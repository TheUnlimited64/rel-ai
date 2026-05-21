import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { TunedModelEditor } from "./TunedModelEditor";
import type { ModelListResponse } from "../api";

const schema = z.object({
  id: z.string().min(1, "Model ID is required"),
  displayName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface TunedCreateFormProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

export function TunedCreateForm({ onSuccess, onError, onCancel }: TunedCreateFormProps) {
  const [baseModelId, setBaseModelId] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [parsedOverrides, setParsedOverrides] = useState<Record<string, unknown> | null>({});

  const utils = trpcHooks.useUtils();
  const { data: selectableModels } = trpcHooks.models.list.useQuery();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { id: "", displayName: "" },
  });

  const mutation = trpcHooks.models.createVirtualTuned.useMutation({
    onSuccess: async () => { await utils.models.list.invalidate(); onSuccess(); },
    onError: (err) => onError(err.message),
  });

  function onSubmit(data: FormValues) {
    if (!baseModelId) { onError("Please select a base model"); return; }
    if (parsedOverrides === null) { onError("Fix JSON validation errors before submitting"); return; }
    if (data.id === baseModelId) { onError("Circular dependency: model ID cannot reference itself"); return; }
    const overrides = Object.keys(parsedOverrides).length > 0 ? parsedOverrides : undefined;
    mutation.mutate({ id: data.id, baseModelId, overrides, displayName: data.displayName || undefined });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vmodel-id">Model ID</Label>
        <Input id="vmodel-id" {...register("id")} placeholder="gpt-4o-turbo" />
        {errors.id && <p className="text-xs text-destructive">{errors.id.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vmodel-display">Display Name</Label>
        <Input id="vmodel-display" {...register("displayName")} placeholder="GPT-4o Turbo" />
      </div>
      <TunedModelEditor
        baseModelId={baseModelId}
        onBaseModelChange={setBaseModelId}
        overridesText={overridesText}
        onOverridesTextChange={setOverridesText}
        parsedOverrides={parsedOverrides}
        onParsedOverridesChange={setParsedOverrides}
        selectableModels={selectableModels ?? []}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
