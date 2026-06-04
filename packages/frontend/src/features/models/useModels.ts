import { useState } from "react";
import { trpcReact as trpcHooks } from "@/lib/trpc";

export type ModelTypeFilter = "all" | "real" | "virtual";

export function parseDependents(error: unknown): string[] | null {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "object" && data !== null && "dependents" in data) {
      const dependents = (data as { dependents?: unknown }).dependents;
      if (Array.isArray(dependents) && dependents.every((d): d is string => typeof d === "string")) {
        return dependents;
      }
    }
  }
  return null;
}

export function useModels() {
  const query = trpcHooks.models.list.useQuery();
  const utils = trpcHooks.useUtils();
  const [typeFilter, setTypeFilter] = useState<ModelTypeFilter>("all");

  const deleteMutation = trpcHooks.models.delete.useMutation({
    onSuccess: (_result, { id }) => {
      utils.models.list.setData(undefined, (prev) =>
        prev ? prev.filter((x) => x.id !== id) : prev,
      );
    },
  });

  const remove = async (id: string): Promise<string[] | null> => {
    try {
      await deleteMutation.mutateAsync({ id });
      return null;
    } catch (err) {
      return parseDependents(err);
    }
  };

  const rawModels = query.data ?? [];
  const models = rawModels.filter((m) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "real") return m.type === "real";
    return m.type === "virtual";
  });

  return { models, loading: query.isLoading, error: query.error?.message ?? null, reload: () => utils.models.list.invalidate(), remove, deleteMutation, typeFilter, setTypeFilter };
}
