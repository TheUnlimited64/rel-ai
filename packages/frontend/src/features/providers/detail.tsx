import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { maskApiKey } from "./api";
import type { ProviderResponse } from "./api";
import { ProviderEditForm } from "./components/ProviderEditForm";
import { ProviderConnectionTest } from "./components/ProviderConnectionTest";
import { ProviderRegenerateKey } from "./components/ProviderRegenerateKey";
import { ApiKeyRevealDialog } from "./components/ApiKeyRevealDialog";

export function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState<{ open: boolean; key: string }>({ open: false, key: "" });

  const query = trpcHooks.providers.get.useQuery({ id: id! }, { enabled: !!id });
  const utils = trpcHooks.useUtils();
  const provider = query.data as ProviderResponse | undefined;
  const loading = query.isLoading;

  const updateMutation = trpcHooks.providers.update.useMutation({
    onSuccess: async () => {
      await utils.providers.get.invalidate({ id });
      await utils.providers.list.invalidate();
    },
  });

  function handleToggle(checked: boolean) {
    if (!provider) return;
    updateMutation.mutate({ id: provider.id, enabled: checked });
  }

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>;
  }
  if (!provider) return <p className="text-destructive">Provider not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/providers")}>← Back</Button>
        <h1 className="text-2xl font-bold">{provider.name}</h1>
        <Badge variant="secondary">{provider.adapterType}</Badge>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <Switch checked={provider.enabled} onCheckedChange={handleToggle} disabled={updateMutation.isPending} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <ProviderEditForm provider={provider} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Base URL</span><span className="col-span-2">{provider.baseUrl}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">API Key</span><span className="col-span-2 font-mono">{maskApiKey(provider.apiKey)}</span>
              </div>
              {provider.config && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Config</span><pre className="col-span-2 text-xs">{(() => { try { return JSON.stringify(JSON.parse(provider.config), null, 2); } catch { return provider.config; } })()}</pre>
                </div>
              )}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="outline" onClick={() => setRegenConfirm(true)}>Regenerate API Key</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ProviderConnectionTest providerId={provider.id} />
      <ProviderRegenerateKey providerId={provider.id} confirmOpen={regenConfirm} onConfirmClose={() => setRegenConfirm(false)}
        onKeyRevealed={(key) => { utils.providers.get.invalidate({ id }); utils.providers.list.invalidate(); setNewKeyDialog({ open: true, key }); }} />
      <ApiKeyRevealDialog open={newKeyDialog.open} apiKey={newKeyDialog.key} onClose={() => setNewKeyDialog({ open: false, key: "" })} />
    </div>
  );
}
