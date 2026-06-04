import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { EndpointEditForm } from "./components/EndpointEditForm";
import { EndpointRegenerateConfirm } from "./components/EndpointRegenerateToken";
import { NewTokenDialog } from "./components/NewTokenDialog";
import { DetailView } from "./components/EndpointDetailView";

export function EndpointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const endpointQuery = trpcHooks.endpoints.get.useQuery({ id: id! }, { enabled: !!id });
  const modelsQuery = trpcHooks.models.list.useQuery();
  const groupsQuery = trpcHooks.modelGroups.list.useQuery();
  const utils = trpcHooks.useUtils();
  const endpoint = endpointQuery.data;
  const allModels = modelsQuery.data ?? [];
  const allGroups = groupsQuery.data ?? [];

  const updateMutation = trpcHooks.endpoints.update.useMutation({
    onSuccess: async () => { await utils.endpoints.get.invalidate({ id }); await utils.endpoints.list.invalidate(); },
  });

  const regenMutation = trpcHooks.endpoints.regenerateToken.useMutation({
    onSuccess: (result) => setNewToken(result.token),
  });

  async function handleSave(data: { name: string; path: string; modelIds: string[]; groupIds: string[] }) {
    if (!id) return "";
    try { await updateMutation.mutateAsync({ id, ...data }); setEditing(false); return ""; }
    catch (err) {
      return err instanceof Error
        ? err.message.includes("DUPLICATE_PATH") ? "This path is already in use" : err.message
        : "Failed to update";
    }
  }

  if (endpointQuery.isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>;
  if (!endpoint) return <p className="text-destructive">Endpoint not found</p>;
  const proxyUrl = `${endpoint.proxyBase}/${endpoint.path}/chat/completions`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/endpoints")}>← Back</Button>
        <h1 className="text-2xl font-bold">{endpoint.name}</h1>
        <Badge variant="secondary" className="font-mono">/{endpoint.path}</Badge>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <Switch checked={endpoint.enabled} onCheckedChange={(c) => updateMutation.mutate({ id: endpoint.id, enabled: c })} disabled={updateMutation.isPending} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <EndpointEditForm endpoint={endpoint} allModels={allModels} allGroups={allGroups} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <DetailView proxyUrl={proxyUrl} models={endpoint.models} groups={endpoint.groups} />
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="outline" onClick={() => setShowRegenConfirm(true)}>Regenerate Token</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <EndpointRegenerateConfirm open={showRegenConfirm} onConfirm={() => { if (id) { setShowRegenConfirm(false); regenMutation.mutate({ id }); } }} onCancel={() => setShowRegenConfirm(false)} />
      <NewTokenDialog token={newToken} onClose={() => setNewToken(null)} />
    </div>
  );
}
