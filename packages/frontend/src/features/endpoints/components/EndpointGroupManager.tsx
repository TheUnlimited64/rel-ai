import { Label } from "@/components/ui/label";

interface EndpointGroupManagerProps {
  groups: { id: string; name: string }[];
  selectedGroupIds: Set<string>;
  onToggle: (id: string) => void;
}

export function EndpointGroupManager({ groups, selectedGroupIds, onToggle }: EndpointGroupManagerProps) {
  return (
    <div className="space-y-2">
      <Label>Groups</Label>
      {!groups || groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups available</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedGroupIds.has(g.id)}
                onChange={() => onToggle(g.id)}
                className="accent-primary"
              />
              <span className="font-mono">{g.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
