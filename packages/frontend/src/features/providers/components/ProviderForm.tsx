import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import { AdapterTypeSchema, type AdapterType } from "@rel-ai/shared";
import { ADAPTER_TYPES, type CreateProviderResponse } from "../api";
import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  adapterType: AdapterTypeSchema,
  baseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
  config: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface ProviderFormProps { onSuccess: (providerId: string) => void; onCancel: () => void; }

export function ProviderForm({ onSuccess, onCancel }: ProviderFormProps) {
  const [apiKeyDialog, setApiKeyDialog] = useState<{ open: boolean; key: string; providerId: string }>({ open: false, key: "", providerId: "" });
  const utils = trpcHooks.useUtils();
  const createMutation = trpcHooks.providers.create.useMutation();
  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", adapterType: "openai", baseUrl: "", apiKey: "" },
  });
  const adapterType = watch("adapterType");

  async function onSubmit(data: FormValues) {
    let configObj: Record<string, unknown> | undefined;
    if (data.config?.trim()) { try { configObj = JSON.parse(data.config); } catch { setError('config', { message: 'Invalid JSON configuration' }); return; } }
    const input = { name: data.name, adapterType: data.adapterType, baseUrl: data.baseUrl, apiKey: data.apiKey, config: configObj };
    const result = await createMutation.mutateAsync(input);
    await utils.providers.list.invalidate();
    const rawKey = "apiKeyRaw" in result ? (result as CreateProviderResponse).apiKeyRaw : null;
    if (!rawKey) return;
    setApiKeyDialog({ open: true, key: rawKey, providerId: result.id });
  }

  function handleDismiss() {
    setApiKeyDialog((prev) => ({ ...prev, open: false }));
    onSuccess(apiKeyDialog.providerId);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
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
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input id="baseUrl" type="url" {...register("baseUrl")} placeholder="https://api.openai.com" />
          {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input id="apiKey" type="password" {...register("apiKey")} />
          {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="config">Config (JSON, optional)</Label>
          <Textarea id="config" {...register("config")} placeholder='{"key": "value"}' rows={3} />
          {errors.config && <p className="text-xs text-destructive">{errors.config.message}</p>}
        </div>
        {createMutation.error && <p className="text-sm text-destructive">{formatMutationError(createMutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button>
        </div>
      </form>
      <ApiKeyRevealDialog open={apiKeyDialog.open} apiKey={apiKeyDialog.key} onClose={handleDismiss} />
    </>
  );
}
