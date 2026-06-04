import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/QueryError";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { GroupDetailView } from "./components/GroupDetailView";

export function ModelGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpcHooks.useUtils();
  const { data: group, isLoading, error } = trpcHooks.modelGroups.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4">
        <QueryError error={error} />
        <Button variant="outline" onClick={() => navigate("/model-groups")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/model-groups")}>
          ← Groups
        </Button>
        <h1 className="text-2xl font-bold font-mono">{group.name}</h1>
      </div>
      <GroupDetailView
        group={group}
        onChanged={() => utils.modelGroups.get.invalidate({ id: id! })}
      />
    </div>
  );
}
