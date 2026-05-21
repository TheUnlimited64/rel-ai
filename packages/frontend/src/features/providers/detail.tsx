import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import type { ProviderResponse, AdapterType } from "./api";

export function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initIdRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; latencyMs: number } | null>(null);

  // Edit form state
  const [name, setName] = useState("");
  const [adapterType, setAdapterType] = useState<AdapterType>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [config, setConfig] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = trpcHooks.providers.get.useQuery({ id: id! }, { enabled: !!id });
  const utils = trpcHooks.useUtils();
  const provider = query.data as ProviderResponse | undefined;
  const loading = query.isLoading;

  // Sync form state when data loads
  useEffect(() => {
    if (provider && initIdRef.current !== id) {
      setName(provider.name);
      setAdapterType(provider.adapterType as AdapterType);
      setBaseUrl(provider.baseUrl);
      setConfig(provider.config ?? "");
      initIdRef.current = id ?? null;
    }
  }, [provider, id]);

  const updateMutation = trpcHooks.providers.update.useMutation({
    onSuccess: async () => {
      await utils.providers.get.invalidate({ id });
      await utils.providers.list.invalidate();
    },
  });

  const testMutation = trpcHooks.providers.testConnection.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: () => {
      setTestResult({ success: false, error: "Request failed", latencyMs: 0 });
    },
  });

  async function handleSave() {
    if (!id) return;
    setError(null);

    let configObj: Record<string, unknown> | undefined;
    if (config.trim()) {
      try { configObj = JSON.parse(config); } catch {
        setError("Config must be valid JSON");
        return;
      }
    }

    const input: Record<string, unknown> = { id, name, adapterType, baseUrl, config: configObj };
    if (apiKey.trim()) input.apiKey = apiKey;
    updateMutation.mutate(input as Parameters<typeof updateMutation.mutate>[0], {
      onSuccess: () => {
        setEditing(false);
        setApiKey("");
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to update");
      },
    });
  }

  function handleTest() {
    if (!id) return;
    setTestResult(null);
    testMutation.mutate({ id });
  }

  function handleToggle(checked: boolean) {
    if (!provider) return;
    updateMutation.mutate({ id: provider.id, enabled: checked });
  }

  const saving = updateMutation.isPending;

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>;
  }

  if (!provider) {
    return <p className="text-destructive">Provider not found</p>;
  }

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
            <Switch
              checked={provider.enabled}
              onCheckedChange={handleToggle}
              disabled={updateMutation.isPending}
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
                <Label>Adapter Type</Label>
                <Select value={adapterType} onValueChange={(v) => { if (v === "openai" || v === "anthropic" || v === "custom") setAdapterType(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>API Key (leave blank to keep current)</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter new key to update" />
              </div>
              <div className="space-y-2">
                <Label>Config (JSON)</Label>
                <Textarea value={config} onChange={(e) => setConfig(e.target.value)} rows={4} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Base URL</span>
                <span className="col-span-2">{provider.baseUrl}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">API Key</span>
                <span className="col-span-2 font-mono">{provider.apiKey}</span>
              </div>
              {provider.config && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Config</span>
                  <pre className="col-span-2 text-xs">{provider.config}</pre>
                </div>
              )}
              <Separator />
              <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Connection Test</CardTitle>
          <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
            {testMutation.isPending ? "Testing..." : "Test Connection"}
          </Button>
        </CardHeader>
        {testResult && (
          <CardContent>
            {testResult.success ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Connected successfully ({testResult.latencyMs}ms)
              </p>
            ) : (
              <p className="text-sm text-destructive">
                ✗ {testResult.error ?? "Connection failed"} ({testResult.latencyMs}ms)
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
