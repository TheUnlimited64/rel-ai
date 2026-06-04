import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import type { GroupEntry } from "../api";

interface GroupEntryEditorProps {
  groupId: string;
  entries: GroupEntry[];
  onChanged: () => void;
}

export function GroupEntryEditor({ groupId, entries, onChanged }: GroupEntryEditorProps) {
  const { data: allModels } = trpcHooks.models.list.useQuery();
  const setEntryMutation = trpcHooks.modelGroups.setEntry.useMutation({
    onSuccess: onChanged,
  });
  const removeEntryMutation = trpcHooks.modelGroups.removeEntry.useMutation({
    onSuccess: onChanged,
  });

  const [newVirtualName, setNewVirtualName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    setAddError(null);
    if (!newVirtualName.trim()) { setAddError("Virtual name required"); return; }
    try {
      await setEntryMutation.mutateAsync({
        groupId,
        virtualName: newVirtualName.trim(),
        modelId: newModelId || null,
      });
      setNewVirtualName("");
      setNewModelId("");
    } catch (e) {
      setAddError(formatMutationError(e as Parameters<typeof formatMutationError>[0]));
    }
  }

  async function handleUpdateModel(virtualName: string, modelId: string | null) {
    await setEntryMutation.mutateAsync({ groupId, virtualName, modelId });
  }

  async function handleRemove(virtualName: string) {
    await removeEntryMutation.mutateAsync({ groupId, virtualName });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Entries</p>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No entries. Add slots below.</p>
      )}

      {entries.map((entry) => (
        <div key={entry.virtualName} className="flex items-center gap-2">
          <span className="w-36 shrink-0 font-mono text-sm">{entry.virtualName}</span>
          <span className="text-muted-foreground">→</span>
          <select
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            value={entry.modelId ?? ""}
            onChange={(e) => handleUpdateModel(entry.virtualName, e.target.value || null)}
          >
            <option value="">— unmapped (interface slot) —</option>
            {(allModels ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>
            ))}
          </select>
          <button
            className="text-xs text-destructive hover:underline shrink-0"
            onClick={() => handleRemove(entry.virtualName)}
          >
            Remove
          </button>
        </div>
      ))}

      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">Virtual name</p>
          <Input
            value={newVirtualName}
            onChange={(e) => setNewVirtualName(e.target.value)}
            placeholder="reasoner"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">Model (optional)</p>
          <select
            className="h-8 w-full rounded border border-input bg-background px-2 text-sm"
            value={newModelId}
            onChange={(e) => setNewModelId(e.target.value)}
          >
            <option value="">— unmapped —</option>
            {(allModels ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={setEntryMutation.isPending}
          className="shrink-0"
        >
          Add
        </Button>
      </div>
      {addError && <p className="text-xs text-destructive">{addError}</p>}
    </div>
  );
}
