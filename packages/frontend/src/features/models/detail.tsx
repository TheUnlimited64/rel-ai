import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import type { ModelResponse } from "./api";

type ResolutionStep = {
  modelId: string;
  providerId: string;
  providerModel: string;
  adapterType: string;
};

export function ModelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initIdRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test resolution
  const [resolutionSteps, setResolutionSteps] = useState<ResolutionStep[] | null>(null);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteDependents, setDeleteDependents] = useState<string[] | null>(null);

  // Edit fields
  const [displayName, setDisplayName] = useState("");
  const [providerModel, setProviderModel] = useState("");
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [chainInput, setChainInput] = useState("");
  const [baseModelId, setBaseModelId] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [overridesError, setOverridesError] = useState<string | null>(null);

  const modelQuery = trpcHooks.models.get.useQuery({ id: id! }, { enabled: !!id });
  const modelsQuery = trpcHooks.models.list.useQuery();
  const utils = trpcHooks.useUtils();
  const model = modelQuery.data as ModelResponse | undefined;
  const allModels = (modelsQuery.data ?? []) as ModelResponse[];
  const loading = modelQuery.isLoading;

  // Sync form state
  useEffect(() => {
    if (model && initIdRef.current !== id) {
      setDisplayName(model.displayName);
      if (model.type === "real") setProviderModel(model.providerModel);
      if (model.type === "virtual" && model.variant === "fallback") setFallbackChain(model.fallbackChain);
      if (model.type === "virtual" && model.variant === "tuned") {
        setBaseModelId(model.baseModelId);
        setOverridesText(Object.keys(model.overrides).length > 0 ? JSON.stringify(model.overrides, null, 2) : "");
      }
      initIdRef.current = id ?? null;
    }
  }, [model, id]);

  const updateMutation = trpcHooks.models.update.useMutation({
    onSuccess: async () => {
      await utils.models.get.invalidate({ id });
      await utils.models.list.invalidate();
    },
  });

  const testMutation = trpcHooks.models.testResolution.useMutation({
    onSuccess: (result) => {
      setResolutionSteps(result.steps as ResolutionStep[]);
    },
    onError: () => {
      setResolutionSteps([]);
    },
  });

  const deleteMutation = trpcHooks.models.delete.useMutation({
    onSuccess: async () => {
      navigate("/models");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const match = msg.match(/HAS_DEPENDENTS:(.+)/);
      if (match) {
        setDeleteDependents((match[1] ?? "").split(","));
      }
    },
  });

  const selectableBases = allModels.filter((m) => m.type === "real" || (m.type === "virtual" && m.variant === "tuned"));

  function handleSave() {
    if (!id) return;
    setError(null);

    const input: Record<string, unknown> = { id, displayName };

    if (model?.type === "real") {
      input.providerModel = providerModel;
    } else if (model?.type === "virtual" && model.variant === "fallback") {
      input.fallbackChain = fallbackChain;
    } else if (model?.type === "virtual" && model.variant === "tuned") {
      input.baseModelId = baseModelId;
      if (overridesText.trim()) {
        try {
          input.overrides = JSON.parse(overridesText);
        } catch {
          setOverridesError("Invalid JSON");
          return;
        }
      } else {
        input.overrides = {};
      }
    }

    updateMutation.mutate(input as Parameters<typeof updateMutation.mutate>[0], {
      onSuccess: () => {
        setEditing(false);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to update");
      },
    });
  }

  function handleTest() {
    if (!id) return;
    setResolutionSteps(null);
    testMutation.mutate({ id });
  }

  function handleDelete() {
    if (!id) return;
    deleteMutation.mutate({ id });
  }

  // Fallback chain editing helpers
  function addChainItem() {
    const trimmed = chainInput.trim();
    if (trimmed && !fallbackChain.includes(trimmed)) {
      setFallbackChain([...fallbackChain, trimmed]);
      setChainInput("");
    }
  }

  function removeChainItem(index: number) {
    setFallbackChain(fallbackChain.filter((_, i) => i !== index));
  }

  function moveChainItem(index: number, direction: "up" | "down") {
    const next = [...fallbackChain];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const temp = next[index];
    next[index] = next[target]!;
    next[target] = temp!;
    setFallbackChain(next);
  }

  const saving = updateMutation.isPending;

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>;
  }

  if (!model) {
    return <p className="text-destructive">Model not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/models")}>← Back</Button>
        <h1 className="text-2xl font-bold">{model.displayName || model.id}</h1>
        {model.type === "real" ? (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Real</Badge>
        ) : (
          <div className="flex items-center gap-1">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Virtual</Badge>
            <Badge variant="outline">{model.variant === "fallback" ? "Fallback" : "Tuned"}</Badge>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
              {testMutation.isPending ? "Testing..." : "Test Resolution"}
            </Button>
            {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              {model.type === "real" && (
                <div className="space-y-2">
                  <Label>Provider Model</Label>
                  <Input value={providerModel} onChange={(e) => setProviderModel(e.target.value)} />
                </div>
              )}
              {model.type === "virtual" && model.variant === "fallback" && (
                <div className="space-y-3">
                  <Label>Fallback Chain</Label>
                  <div className="flex gap-2">
                    <Input value={chainInput} onChange={(e) => setChainInput(e.target.value)} placeholder="Model ID" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChainItem(); } }} />
                    <Button type="button" variant="outline" onClick={addChainItem}>Add</Button>
                  </div>
                  {fallbackChain.map((item, i) => (
                    <div key={`${item}-${i}`} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 font-mono">{item}</span>
                      <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => moveChainItem(i, "up")}>↑</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={i === fallbackChain.length - 1} onClick={() => moveChainItem(i, "down")}>↓</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeChainItem(i)}>✕</Button>
                    </div>
                  ))}
                </div>
              )}
              {model.type === "virtual" && model.variant === "tuned" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Base Model</Label>
                    <Select value={baseModelId} onValueChange={(v) => { if (v) setBaseModelId(v); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {selectableBases.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.displayName || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overrides (JSON)</Label>
                    <Textarea
                      value={overridesText}
                      onChange={(e) => { setOverridesText(e.target.value); setOverridesError(null); }}
                      onBlur={() => {
                        if (overridesText.trim()) {
                          try { JSON.parse(overridesText); } catch { setOverridesError("Invalid JSON"); }
                        }
                      }}
                      rows={4}
                    />
                    {overridesError && <p className="text-xs text-destructive">{overridesError}</p>}
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="col-span-2 font-mono">{model.id}</span>
              </div>
              {model.type === "real" && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Provider ID</span>
                  <span className="col-span-2 font-mono">{model.providerId}</span>
                </div>
              )}
              {model.type === "real" && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Provider Model</span>
                  <span className="col-span-2">{model.providerModel}</span>
                </div>
              )}
              {model.type === "virtual" && model.variant === "fallback" && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Fallback Chain</span>
                  <span className="col-span-2">
                    {model.fallbackChain.map((fid, i) => (
                      <span key={i}>
                        <span className="font-mono">{fid}</span>
                        {i < model.fallbackChain.length - 1 && <span className="text-muted-foreground"> → </span>}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {model.type === "virtual" && model.variant === "tuned" && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Base Model</span>
                    <span className="col-span-2 font-mono">{model.baseModelId}</span>
                  </div>
                  {Object.keys(model.overrides).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-muted-foreground">Overrides</span>
                      <pre className="col-span-2 text-xs">{JSON.stringify(model.overrides, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="col-span-2">{new Date(model.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Updated</span>
                <span className="col-span-2">{new Date(model.updatedAt).toLocaleString()}</span>
              </div>
              <Separator />
              <Button variant="destructive" onClick={() => setShowDelete(true)}>Delete Model</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution chain */}
      {resolutionSteps !== null && (
        <Card>
          <CardHeader><CardTitle>Resolution Chain</CardTitle></CardHeader>
          <CardContent>
            {resolutionSteps.length === 0 ? (
              <p className="text-sm text-destructive">Resolution failed</p>
            ) : (
              <div className="space-y-2">
                {resolutionSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 rounded border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Step {i + 1}</span>
                    <span className="font-mono">{step.modelId}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{step.providerModel}</span>
                    <Badge variant="secondary">{step.adapterType}</Badge>
                    <span className="text-muted-foreground">(via {step.providerId})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={() => { setShowDelete(false); setDeleteDependents(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Model</DialogTitle></DialogHeader>
          {deleteDependents ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Cannot delete: this model is referenced by other models.</p>
              <p className="text-sm text-muted-foreground">Dependents: {deleteDependents.join(", ")}</p>
              <p className="text-sm text-muted-foreground">Remove references first, then try again.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this model?</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteDependents(null); }}>
              {deleteDependents ? "Close" : "Cancel"}
            </Button>
            {!deleteDependents && (
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
