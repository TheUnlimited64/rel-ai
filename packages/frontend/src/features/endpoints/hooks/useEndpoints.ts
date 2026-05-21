import { trpcReact as trpcHooks } from "@/lib/trpc";
import type { EndpointListResponse } from "../api";

export function useEndpoints() {
  const query = trpcHooks.endpoints.list.useQuery();
  const utils = trpcHooks.useUtils();

  const toggleMutation = trpcHooks.endpoints.update.useMutation({
    onSuccess: async (updated) => {
      utils.endpoints.list.setData(undefined, (prev) =>
        prev
          ? prev.map((x) =>
              x.id === updated.id
                ? { ...updated, modelCount: updated.models.length }
                : x,
            )
          : prev,
      );
    },
  });

  const deleteMutation = trpcHooks.endpoints.delete.useMutation({
    onSuccess: async (_result, { id }) => {
      utils.endpoints.list.setData(undefined, (prev) =>
        prev ? prev.filter((x) => x.id !== id) : prev,
      );
      await utils.endpoints.get.invalidate();
    },
  });

  const remove = (id: string) => deleteMutation.mutateAsync({ id });

  return {
    endpoints: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    reload: () => utils.endpoints.list.invalidate(),
    toggleEnabled: (ep: EndpointListResponse) => toggleMutation.mutate({ id: ep.id, enabled: !ep.enabled }),
    remove,
    toggleMutation,
    deleteMutation,
  };
}
