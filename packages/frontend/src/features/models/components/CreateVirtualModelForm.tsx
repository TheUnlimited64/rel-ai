import { useState } from "react";
import { Label } from "@/components/ui/label";
import { FallbackCreateForm } from "./FallbackCreateForm";
import { TunedCreateForm } from "./TunedCreateForm";

type VirtualMode = "fallback" | "tuned";

interface CreateVirtualModelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateVirtualModelForm({ onSuccess, onCancel }: CreateVirtualModelFormProps) {
  const [mode, setMode] = useState<VirtualMode>("fallback");
  const [error, setError] = useState<string | null>(null);

  function handleSuccess() {
    setError(null);
    onSuccess();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-md border p-1">
        <button
          type="button"
          className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === "fallback" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => { setMode("fallback"); setError(null); }}
        >
          Fallback
        </button>
        <button
          type="button"
          className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === "tuned" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => { setMode("tuned"); setError(null); }}
        >
          Tuned
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "fallback" ? (
        <FallbackCreateForm onSuccess={handleSuccess} onError={setError} onCancel={onCancel} />
      ) : (
        <TunedCreateForm onSuccess={handleSuccess} onError={setError} onCancel={onCancel} />
      )}
    </div>
  );
}
