import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpcReact as trpcHooks } from "@/lib/trpc";

type VirtualMode = "fallback" | "tuned";

interface CreateVirtualModelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateVirtualModelForm({ onSuccess, onCancel }: CreateVirtualModelFormProps) {
  const [mode, setMode] = useState<VirtualMode>("fallback");
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fallback state
  const [chainItems, setChainItems] = useState<string[]>([]);
  const [chainInput, setChainInput] = useState("");

  // Tuned state
  const [baseModelId, setBaseModelId] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [overridesError, setOverridesError] = useState<string | null>(null);

  const utils = trpcHooks.useUtils();
  const { data: selectableModels } = trpcHooks.models.list.useQuery();

  const fallbackMutation = trpcHooks.models.createVirtualFallback.useMutation({
    onSuccess: async () => {
      await utils.models.list.invalidate();
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const tunedMutation = trpcHooks.models.createVirtualTuned.useMutation({
    onSuccess: async () => {
      await utils.models.list.invalidate();
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function addChainItem() {
    const trimmed = chainInput.trim();
    if (trimmed && !chainItems.includes(trimmed)) {
      setChainItems([...chainItems, trimmed]);
      setChainInput("");
    }
  }

  function removeChainItem(index: number) {
    setChainItems(chainItems.filter((_, i) => i !== index));
  }

  function moveChainItem(index: number, direction: "up" | "down") {
    const next = [...chainItems];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    const temp = next[index];
    next[index] = next[target]!;
    next[target] = temp!;
    setChainItems(next);
  }

  function validateOverrides(): Record<string, unknown> | null {
    if (!overridesText.trim()) return {};
    try {
      const parsed = JSON.parse(overridesText);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setOverridesError("Must be a JSON object");
        return null;
      }
      setOverridesError(null);
      return parsed;
    } catch {
      setOverridesError("Invalid JSON");
      return null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "fallback") {
      if (chainItems.length === 0) {
        setError("Fallback chain must have at least one model");
        return;
      }
      fallbackMutation.mutate({
        id,
        fallbackChain: chainItems,
        displayName: displayName || undefined,
      });
    } else {
      if (!baseModelId) {
        setError("Please select a base model");
        return;
      }
      const overrides = validateOverrides();
      if (overrides === null) return;
      tunedMutation.mutate({
        id,
        baseModelId,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        displayName: displayName || undefined,
      });
    }
  }

  const isPending = fallbackMutation.isPending || tunedMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 rounded-md border p-1">
        <button
          type="button"
          className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === "fallback" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setMode("fallback")}
        >
          Fallback
        </button>
        <button
          type="button"
          className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === "tuned" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setMode("tuned")}
        >
          Tuned
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vmodel-id">Model ID</Label>
        <Input id="vmodel-id" value={id} onChange={(e) => setId(e.target.value)} required placeholder={mode === "fallback" ? "fallback-group" : "gpt-4o-turbo"} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vmodel-display">Display Name</Label>
        <Input id="vmodel-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={mode === "fallback" ? "Fallback Group" : "GPT-4o Turbo"} />
      </div>

      {mode === "fallback" ? (
        <div className="space-y-3">
          <Label>Fallback Chain</Label>
          <div className="flex gap-2">
            <Input value={chainInput} onChange={(e) => setChainInput(e.target.value)} placeholder="Model ID" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChainItem(); } }} />
            <Button type="button" variant="outline" onClick={addChainItem}>Add</Button>
          </div>
          {chainItems.length > 0 && (
            <div className="space-y-1">
              {chainItems.map((item, i) => (
                <div key={`${item}-${i}`} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 font-mono">{item}</span>
                  <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => moveChainItem(i, "up")}>↑</Button>
                  <Button type="button" variant="ghost" size="sm" disabled={i === chainItems.length - 1} onClick={() => moveChainItem(i, "down")}>↓</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeChainItem(i)}>✕</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Base Model</Label>
            <Select value={baseModelId} onValueChange={(v) => { if (v) setBaseModelId(v); }}>
              <SelectTrigger><SelectValue placeholder="Select base model" /></SelectTrigger>
              <SelectContent>
                {(selectableModels ?? [])
                  .filter((m) => m.type === "real" || (m.type === "virtual" && m.variant === "tuned"))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.displayName || m.id}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vmodel-overrides">Overrides (JSON)</Label>
            <Textarea
              id="vmodel-overrides"
              value={overridesText}
              onChange={(e) => { setOverridesText(e.target.value); setOverridesError(null); }}
              onBlur={() => { if (overridesText.trim()) validateOverrides(); }}
              placeholder='{"temperature": 0.7}'
              rows={4}
            />
            {overridesError && <p className="text-xs text-destructive">{overridesError}</p>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
