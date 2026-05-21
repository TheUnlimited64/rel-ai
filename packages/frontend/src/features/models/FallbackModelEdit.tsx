import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FallbackChainBuilder } from "./components/FallbackChainBuilder";
import { trpcReact as trpcHooks } from "@/lib/trpc";

const schema = z.object({
  displayName: z.string().min(1, "Display name is required"),
});
type FormValues = z.infer<typeof schema>;

type UpdateModelInput = Parameters<typeof trpcHooks.models.update.useMutation>[0] & Record<string, unknown>;

interface FallbackModelEditProps {
  defaultDisplayName: string;
  defaultChain: string[];
  modelId: string;
  onSave: (input: UpdateModelInput) => Promise<void>;
  onCancel: () => void;
}

export function FallbackModelEdit({ defaultDisplayName, defaultChain, modelId, onSave, onCancel }: FallbackModelEditProps) {
  const modelIdRef = useRef(modelId);
  useEffect(() => { modelIdRef.current = modelId; }, [modelId]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fallbackChain, setFallbackChain] = useState<string[]>(defaultChain);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: defaultDisplayName },
  });

  async function onSubmit(data: FormValues) {
    setSaving(true); setError(null);
    try { await onSave({ id: modelIdRef.current, displayName: data.displayName, fallbackChain }); }
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
      <FallbackChainBuilder items={fallbackChain} onChange={setFallbackChain} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
