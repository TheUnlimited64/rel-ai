import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelOverridesEditor } from "./ModelOverridesEditor";
import type { ModelListResponse } from "../api";

interface TunedModelEditorProps {
  baseModelId: string;
  onBaseModelChange: (id: string) => void;
  overridesText: string;
  onOverridesTextChange: (text: string) => void;
  parsedOverrides: Record<string, unknown> | null;
  onParsedOverridesChange: (parsed: Record<string, unknown> | null) => void;
  selectableModels: ModelListResponse[];
}

export function TunedModelEditor({
  baseModelId,
  onBaseModelChange,
  overridesText,
  onOverridesTextChange,
  parsedOverrides,
  onParsedOverridesChange,
  selectableModels,
}: TunedModelEditorProps) {
  const bases = selectableModels.filter(
    (m) => m.type === "real" || (m.type === "virtual" && m.variant === "tuned"),
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Base Model</Label>
        <Select value={baseModelId} onValueChange={(v) => { if (v) onBaseModelChange(v); }}>
          <SelectTrigger><SelectValue placeholder="Select base model" /></SelectTrigger>
          <SelectContent>
            {bases.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.displayName || m.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ModelOverridesEditor
        id="tuned-overrides"
        value={overridesText}
        onChange={onOverridesTextChange}
        parsedOverrides={parsedOverrides}
        onParsedChange={onParsedOverridesChange}
      />
    </div>
  );
}
