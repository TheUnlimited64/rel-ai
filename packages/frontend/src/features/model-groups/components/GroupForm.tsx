import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import type { ModelGroupListItem } from "../api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  interfaceId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface GroupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function GroupForm({ onSuccess, onCancel }: GroupFormProps) {
  const utils = trpcHooks.useUtils();
  const { data: allGroups } = trpcHooks.modelGroups.list.useQuery();
  const createMutation = trpcHooks.modelGroups.create.useMutation({
    onSuccess: () => { utils.modelGroups.list.invalidate(); onSuccess(); },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", interfaceId: "" },
  });

  function onSubmit(data: FormValues) {
    createMutation.mutate({
      name: data.name,
      description: data.description || undefined,
      interfaceId: data.interfaceId || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grp-name">Name</Label>
        <Input id="grp-name" {...register("name")} placeholder="provider1" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="grp-desc">Description</Label>
        <Input id="grp-desc" {...register("description")} placeholder="Optional description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="grp-iface">Implements interface (optional)</Label>
        <select
          id="grp-iface"
          {...register("interfaceId")}
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">— none (standalone) —</option>
          {(allGroups ?? []).map((g: ModelGroupListItem) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Selecting an interface copies its slot names as unmapped entries.
        </p>
      </div>
      {createMutation.error && (
        <p className="text-sm text-destructive">{formatMutationError(createMutation.error)}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}
