import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEndpoint, fetchModels } from "../api";
import type { ModelListResponse, EndpointCreateResponse } from "../api";

const PATH_REGEX = /^[a-z0-9-]+$/;

interface EndpointFormProps {
  onSuccess: (created: EndpointCreateResponse) => void;
  onCancel: () => void;
}

export function EndpointForm({ onSuccess, onCancel }: EndpointFormProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [models, setModels] = useState<ModelListResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch(() => {});
  }, []);

  function handlePathChange(value: string) {
    setPath(value);
    if (value && !PATH_REGEX.test(value)) {
      setPathError("Only lowercase letters, numbers, and hyphens");
    } else {
      setPathError(null);
    }
  }

  function toggleModel(id: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!PATH_REGEX.test(path)) {
      setPathError("Only lowercase letters, numbers, and hyphens");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createEndpoint({
        name,
        path,
        modelIds: Array.from(selectedModelIds),
      });
      onSuccess(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes("DUPLICATE_PATH")
            ? "This path is already in use"
            : err.message
          : "Failed to create endpoint",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ep-name">Name</Label>
        <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-path">Path</Label>
        <Input
          id="ep-path"
          value={path}
          onChange={(e) => handlePathChange(e.target.value)}
          placeholder="my-endpoint"
          required
        />
        {pathError && <p className="text-xs text-destructive">{pathError}</p>}
        {!pathError && (
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Models</Label>
        {models.length === 0 ? (
          <p className="text-sm text-muted-foreground">No models available</p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
            {models.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedModelIds.has(m.id)}
                  onChange={() => toggleModel(m.id)}
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !!pathError}>
          {submitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}
