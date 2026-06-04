import type { ModelGroupListItem } from "../api";

interface GroupTableProps {
  groups: ModelGroupListItem[];
  onDelete: (id: string) => void;
  onClickRow: (id: string) => void;
}

export function GroupTable({ groups, onDelete, onClickRow }: GroupTableProps) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No model groups configured.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-2 font-medium">Name</th>
          <th className="pb-2 font-medium">Description</th>
          <th className="pb-2 font-medium">Interface</th>
          <th className="pb-2 font-medium">Entries</th>
          <th className="pb-2" />
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr
            key={g.id}
            className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onClickRow(g.id)}
          >
            <td className="py-2 font-mono font-medium">{g.name}</td>
            <td className="py-2 text-muted-foreground">{g.description ?? "—"}</td>
            <td className="py-2 text-muted-foreground">
              {g.interfaceId ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">impl</span>
              ) : (
                <span className="rounded bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">standalone</span>
              )}
            </td>
            <td className="py-2">{g.entryCount}</td>
            <td className="py-2 text-right">
              <button
                className="text-xs text-destructive hover:underline"
                onClick={(e) => { e.stopPropagation(); onDelete(g.id); }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
