import { useState, useCallback } from "react";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const jsonSchema = z.record(z.string(), z.unknown());

interface ModelOverridesEditorProps {
  value: string;
  onChange: (value: string) => void;
  parsedOverrides: Record<string, unknown> | null;
  onParsedChange: (parsed: Record<string, unknown> | null) => void;
  id?: string;
}

export function ModelOverridesEditor({ value, onChange, parsedOverrides, onParsedChange, id }: ModelOverridesEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const validateAndSet = useCallback((text: string) => {
    onChange(text);
    if (!text.trim()) {
      setError(null);
      onParsedChange({});
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const validation = jsonSchema.safeParse(parsed);
      if (!validation.success) {
        setError("Must be a JSON object");
        onParsedChange(null);
      } else {
        setError(null);
        onParsedChange(validation.data);
      }
    } catch {
      setError("Invalid JSON");
      onParsedChange(null);
    }
  }, [onChange, onParsedChange]);

  function handleBlur() {
    if (value.trim()) validateAndSet(value);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id ?? "model-overrides"}>Overrides (JSON)</Label>
      <Textarea
        id={id ?? "model-overrides"}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setError(null);
        }}
        onBlur={handleBlur}
        placeholder='{"temperature": 0.7}'
        rows={4}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
