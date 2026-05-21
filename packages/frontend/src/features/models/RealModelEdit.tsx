import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";

const schema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  providerModel: z.string().min(1, "Provider model is required"),
});
type FormValues = z.infer<typeof schema>;

type UpdateModelInput = Parameters<typeof trpcHooks.models.update.useMutation>[0] & Record<string, unknown>;

interface RealModelEditProps {
  defaultDisplayName: string;
  defaultProviderModel: string;
  modelId: string;
  onSave: (input: UpdateModelInput) => Promise<void>;
  onCancel: () => void;
}

export function RealModelEdit({ defaultDisplayName, defaultProviderModel, modelId, onSave, onCancel }: RealModelEditProps) {
  const modelIdRef = useRef(modelId);
  useEffect(() => { modelIdRef.current = modelId; }, [modelId]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: defaultDisplayName, providerModel: defaultProviderModel },
  });

  async function onSubmit(data: FormValues) {
    setSaving(true); setError(null);
    try { await onSave({ id: modelIdRef.current, displayName: data.displayName, providerModel: data.providerModel }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Display Name</Label>
        <Input {...register("displayName")} />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Provider Model</Label>
        <Input {...register("providerModel")} />
        {errors.providerModel && <p className="text-xs text-destructive">{errors.providerModel.message}</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
