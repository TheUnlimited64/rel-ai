import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRealModel, fetchProviders } from "../api";
import type { ProviderOption } from "../api";

interface CreateRealModelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateRealModelForm({ onSuccess, onCancel }: CreateRealModelFormProps) {
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [providerModel, setProviderModel] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders().then(setProviders).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!providerId) {
      setError("Please select a provider");
      return;
    }
    setSubmitting(true);
    try {
      await createRealModel({
        id,
        providerId,
        providerModel,
        displayName: displayName || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create model");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="real-id">Model ID</Label>
        <Input id="real-id" value={id} onChange={(e) => setId(e.target.value)} required placeholder="gpt-4o" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="real-display">Display Name</Label>
        <Input id="real-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="GPT-4o" />
      </div>
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={providerId} onValueChange={(v) => { if (v) setProviderId(v); }}>
          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.adapterType})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {providers.length === 0 && (
          <p className="text-xs text-muted-foreground">No providers available. Create one first.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="real-provider-model">Provider Model Name</Label>
        <Input id="real-provider-model" value={providerModel} onChange={(e) => setProviderModel(e.target.value)} required placeholder="gpt-4o-2024-08-06" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
