import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ModelResponse } from "./api";

interface ModelDetailViewProps {
  model: ModelResponse;
  onDelete: () => void;
}

export function ModelDetailView({ model, onDelete }: ModelDetailViewProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">ID</span>
        <span className="col-span-2 font-mono">{model.id}</span>
      </div>
      {model.type === "real" && (
        <>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-muted-foreground">Provider ID</span>
            <span className="col-span-2 font-mono">{model.providerId}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-muted-foreground">Provider Model</span>
            <span className="col-span-2">{model.providerModel}</span>
          </div>
        </>
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
      <button type="button" className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>
        Delete Model
      </button>
    </div>
  );
}
