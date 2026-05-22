import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import { FallbackChainBuilder } from "./FallbackChainBuilder";

const schema = z.object({
  id: z.string().min(1, "Model ID is required"),
  displayName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface FallbackCreateFormProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

export function FallbackCreateForm({ onSuccess, onError, onCancel }: FallbackCreateFormProps) {
  const [chainItems, setChainItems] = useState<string[]>([]);
  const utils = trpcHooks.useUtils();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { id: "", displayName: "" },
  });

  const mutation = trpcHooks.models.createVirtualFallback.useMutation({
    onSuccess: async () => { await utils.models.list.invalidate(); onSuccess(); },
    onError: (err) => onError(formatMutationError(err)),
  });

  function onSubmit(data: FormValues) {
    if (chainItems.length === 0) { onError("Fallback chain must have at least one model"); return; }
    if (chainItems.includes(data.id)) { onError("Circular dependency: model ID cannot reference itself"); return; }
    mutation.mutate({ id: data.id, fallbackChain: chainItems, displayName: data.displayName || undefined });
  }

  const isPending = mutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vmodel-id">Model ID</Label>
        <Input id="vmodel-id" {...register("id")} placeholder="fallback-group" />
        {errors.id && <p className="text-xs text-destructive">{errors.id.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vmodel-display">Display Name</Label>
        <Input id="vmodel-display" {...register("displayName")} placeholder="Fallback Group" />
      </div>
      <FallbackChainBuilder items={chainItems} onChange={setChainItems} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
