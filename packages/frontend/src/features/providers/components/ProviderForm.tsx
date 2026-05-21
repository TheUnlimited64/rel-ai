import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProvider } from "../api";
import type { AdapterType } from "../api";

interface ProviderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProviderForm({ onSuccess, onCancel }: ProviderFormProps) {
  const [name, setName] = useState("");
  const [adapterType, setAdapterType] = useState<AdapterType>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [config, setConfig] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let configObj: Record<string, unknown> | undefined;
    if (config.trim()) {
      try {
        configObj = JSON.parse(config);
      } catch {
        setError("Config must be valid JSON");
        setSubmitting(false);
        return;
      }
    }

    try {
      await createProvider({ name, adapterType, baseUrl, apiKey, config: configObj });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adapterType">Adapter Type</Label>
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
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input id="baseUrl" type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="config">Config (JSON, optional)</Label>
        <Textarea id="config" value={config} onChange={(e) => setConfig(e.target.value)} placeholder='{"key": "value"}' rows={3} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
