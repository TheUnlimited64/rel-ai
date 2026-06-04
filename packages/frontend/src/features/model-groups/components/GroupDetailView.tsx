import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";
import { GroupEntryEditor } from "./GroupEntryEditor";
import type { ModelGroupDetail } from "../api";

interface GroupDetailViewProps {
  group: ModelGroupDetail;
  onChanged: () => void;
}

export function GroupDetailView({ group, onChanged }: GroupDetailViewProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMutation = trpcHooks.modelGroups.update.useMutation({
    onSuccess: () => { setEditing(false); onChanged(); },
  });

  async function handleSave() {
    setSaveError(null);
    try {
      await updateMutation.mutateAsync({
        id: group.id,
        name,
        description: description || null,
      });
    } catch (e) {
      setSaveError(formatMutationError(e as Parameters<typeof formatMutationError>[0]));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => { setName(group.name); setDescription(group.description ?? ""); setEditing(true); }}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="grp-edit-name">Name</Label>
                <Input id="grp-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="grp-edit-desc">Description</Label>
                <Input id="grp-edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex gap-4">
                <dt className="w-28 text-muted-foreground">Name</dt>
                <dd className="font-mono font-medium">{group.name}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-28 text-muted-foreground">Description</dt>
                <dd>{group.description ?? "—"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-28 text-muted-foreground">Interface</dt>
                <dd className="font-mono text-xs">{group.interfaceId ?? "—"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-28 text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs text-muted-foreground">{group.id}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupEntryEditor groupId={group.id} entries={group.entries} onChanged={onChanged} />
        </CardContent>
      </Card>
    </div>
  );
}
