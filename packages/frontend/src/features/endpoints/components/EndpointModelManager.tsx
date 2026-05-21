import { Label } from "@/components/ui/label";

interface EndpointModelManagerProps {
  models: { id: string; displayName: string; type: string }[];
  selectedModelIds: Set<string>;
  onToggle: (id: string) => void;
}

export function EndpointModelManager({ models, selectedModelIds, onToggle }: EndpointModelManagerProps) {
  return (
    <div className="space-y-2">
      <Label>Models</Label>
      {!models || models.length === 0 ? (
        <p className="text-sm text-muted-foreground">No models available</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
          {models.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedModelIds.has(m.id)}
                onChange={() => onToggle(m.id)}
                className="accent-primary"
              />
              <span>{m.displayName}</span>
              <span className="text-xs text-muted-foreground">({m.type})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
