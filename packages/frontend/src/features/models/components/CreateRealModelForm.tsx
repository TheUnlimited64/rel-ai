import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";

const formSchema = z.object({
  id: z.string().min(1, "Model ID is required"),
  displayName: z.string().optional(),
  providerId: z.string().min(1, "Provider is required"),
  providerModel: z.string().min(1, "Provider model name is required"),
});
type FormValues = z.infer<typeof formSchema>;

interface CreateRealModelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateRealModelForm({ onSuccess, onCancel }: CreateRealModelFormProps) {
  const utils = trpcHooks.useUtils();
  const { data: providers } = trpcHooks.providers.list.useQuery();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { id: "", displayName: "", providerId: "", providerModel: "" },
  });
  const providerId = watch("providerId");

  const createMutation = trpcHooks.models.createReal.useMutation({
    onSuccess: async () => {
      await utils.models.list.invalidate();
      onSuccess();
    },
  });

  function onSubmit(data: FormValues) {
    createMutation.mutate({
      id: data.id,
      providerId: data.providerId,
      providerModel: data.providerModel,
      displayName: data.displayName || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="real-id">Model ID</Label>
        <Input id="real-id" {...register("id")} placeholder="gpt-4o" />
        {errors.id && <p className="text-xs text-destructive">{errors.id.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="real-display">Display Name</Label>
        <Input id="real-display" {...register("displayName")} placeholder="GPT-4o" />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={providerId} onValueChange={(v) => { if (v) setValue("providerId", v, { shouldValidate: true }); }}>
          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
          <SelectContent>
            {providers?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.adapterType})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.providerId && <p className="text-xs text-destructive">{errors.providerId.message}</p>}
        {!providers || providers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No providers available. Create one first.</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="real-provider-model">Provider Model Name</Label>
        <Input id="real-provider-model" {...register("providerModel")} placeholder="gpt-4o-2024-08-06" />
        {errors.providerModel && <p className="text-xs text-destructive">{errors.providerModel.message}</p>}
      </div>
      {createMutation.error && <p className="text-sm text-destructive">{formatMutationError(createMutation.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
