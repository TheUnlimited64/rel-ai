import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EndpointGetResponse, ModelListResponse } from "./api";
import { fetchEndpoint, updateEndpoint, regenerateToken, fetchModels } from "./api";

const PATH_REGEX = /^[a-z0-9-]+$/;
const PROXY_BASE = "http://localhost:3000/v1";

export function EndpointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState<EndpointGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [allModels, setAllModels] = useState<ModelListResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [pathError, setPathError] = useState<string | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Token regeneration
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [data, models] = await Promise.all([fetchEndpoint(id), fetchModels()]);
      setEndpoint(data);
      setAllModels(models);
      setName(data.name);
      setPath(data.path);
      setSelectedModelIds(new Set(data.models.map((m) => m.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load endpoint");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function handlePathChange(value: string) {
    setPath(value);
    if (value && !PATH_REGEX.test(value)) {
      setPathError("Only lowercase letters, numbers, and hyphens");
    } else {
      setPathError(null);
    }
  }

  function toggleModelId(mid: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid);
      else next.add(mid);
      return next;
    });
  }

  async function handleSave() {
    if (!id || pathError) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEndpoint({
        id,
        name,
        path,
        modelIds: Array.from(selectedModelIds),
      });
      setEndpoint(updated);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes("DUPLICATE_PATH")
            ? "This path is already in use"
            : err.message
          : "Failed to update",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!id) return;
    setShowRegenConfirm(false);
    try {
      const result = await regenerateToken(id);
      setNewToken(result.token);
    } catch {
      setError("Failed to regenerate token");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!endpoint) {
    return <p className="text-destructive">Endpoint not found</p>;
  }

  const proxyUrl = `${PROXY_BASE}/${endpoint.path}/chat/completions`;

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
            <Switch
              checked={endpoint.enabled}
              onCheckedChange={async (checked) => {
                const updated = await updateEndpoint({ id: endpoint.id, enabled: checked });
                setEndpoint(updated);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Path</Label>
                <Input value={path} onChange={(e) => handlePathChange(e.target.value)} />
                {pathError && <p className="text-xs text-destructive">{pathError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Models</Label>
                {allModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No models available</p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
                    {allModels.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedModelIds.has(m.id)}
                          onChange={() => toggleModelId(m.id)}
                          className="accent-primary"
                        />
                        <span>{m.displayName}</span>
                        <span className="text-xs text-muted-foreground">({m.type})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !!pathError}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Proxy URL</span>
                <span className="col-span-2 font-mono text-xs break-all">{proxyUrl}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Token</span>
                <div className="col-span-2 flex items-center gap-2">
                  <code className="text-xs">••••••••</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(proxyUrl)}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Models</span>
                <span className="col-span-2">
                  {endpoint.models.length === 0
                    ? <span className="text-muted-foreground">None assigned</span>
                    : endpoint.models.map((m) => (
                      <Badge key={m.id} variant="secondary" className="mr-1">{m.displayName}</Badge>
                    ))
                  }
                </span>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="outline" onClick={() => setShowRegenConfirm(true)}>
                  Regenerate Token
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Token Confirmation */}
      <Dialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regenerate Token</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will invalidate the current token. Any clients using it will need to be updated. Continue?
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowRegenConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRegenerate}>Regenerate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Token Display */}
      <Dialog open={newToken !== null} onOpenChange={() => setNewToken(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Token</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy the token below. <strong>This token will not be shown again.</strong>
          </p>
          <div className="flex items-center gap-2 rounded border bg-muted p-3">
            <code className="flex-1 break-all text-sm">{newToken}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { if (newToken) navigator.clipboard.writeText(newToken); }}
            >
              Copy
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setNewToken(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
