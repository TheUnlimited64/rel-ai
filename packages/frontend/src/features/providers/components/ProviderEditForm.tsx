import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { AdapterTypeSchema, type AdapterType } from "@rel-ai/shared";
import { ADAPTER_TYPES, type ProviderResponse } from "../api";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  adapterType: AdapterTypeSchema,
  baseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().optional(),
  config: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface ProviderEditFormProps { provider: ProviderResponse; onCancel: () => void; }

export function ProviderEditForm({ provider, onCancel }: ProviderEditFormProps) {
  const utils = trpcHooks.useUtils();
  const updateMutation = trpcHooks.providers.update.useMutation({
    onSuccess: async () => {
      await utils.providers.get.invalidate({ id: provider.id });
      await utils.providers.list.invalidate();
    },
  });

  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: provider.name, adapterType: provider.adapterType, baseUrl: provider.baseUrl, apiKey: "", config: provider.config ?? "" },
  });
  const adapterType = watch("adapterType");

  async function onSubmit(data: EditFormValues) {
    let configObj: Record<string, unknown> | undefined;
    if (data.config?.trim()) { try { configObj = JSON.parse(data.config); } catch { setError('config', { message: 'Invalid JSON configuration' }); return; } }
    const input = {
      id: provider.id,
      name: data.name,
      adapterType: data.adapterType,
      baseUrl: data.baseUrl,
      config: configObj,
      ...(data.apiKey?.trim() ? { apiKey: data.apiKey } : {}),
    };
    updateMutation.mutate(input, {
      onSuccess: () => onCancel(),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Adapter Type</Label>
        <Select value={adapterType} onValueChange={(v) => { if (ADAPTER_TYPES.includes(v as AdapterType)) setValue("adapterType", v as AdapterType, { shouldValidate: true }); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ADAPTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.adapterType && <p className="text-xs text-destructive">{errors.adapterType.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-baseUrl">Base URL</Label>
        <Input id="edit-baseUrl" type="url" {...register("baseUrl")} />
        {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-apiKey">API Key (leave blank to keep current)</Label>
        <Input id="edit-apiKey" type="password" {...register("apiKey")} placeholder="Enter new key to update" />
        {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-config">Config (JSON)</Label>
        <Textarea id="edit-config" {...register("config")} rows={4} />
        {errors.config && <p className="text-xs text-destructive">{errors.config.message}</p>}
      </div>
      {updateMutation.error && <p className="text-sm text-destructive">{updateMutation.error.message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
