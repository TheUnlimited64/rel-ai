import { trpcReact as trpcHooks } from "@/lib/trpc";
import { parseProviderResponse, parseProviderResponseArray } from "../api";
import type { ProviderResponse } from "../api";

export function useProviders() {
  const query = trpcHooks.providers.list.useQuery();
  const utils = trpcHooks.useUtils();

  const toggleMutation = trpcHooks.providers.update.useMutation({
    onSuccess: (updated) => {
      utils.providers.list.setData(undefined, (prev) =>
        prev ? prev.map((x) => (x.id === updated.id ? parseProviderResponse(updated) : x)) : prev,
      );
    },
  });

  const deleteMutation = trpcHooks.providers.delete.useMutation({
    onSuccess: (_result, { id }) => {
      utils.providers.list.setData(undefined, (prev) =>
        prev ? prev.filter((x) => x.id !== id) : prev,
      );
    },
  });

  const remove = (id: string) => deleteMutation.mutateAsync({ id });

  return {
    providers: parseProviderResponseArray(query.data ?? []),
    loading: query.isLoading,
    error: query.error?.message ?? null,
    reload: () => utils.providers.list.invalidate(),
    toggleEnabled: (p: ProviderResponse) => { toggleMutation.mutate({ id: p.id, enabled: !p.enabled }); },
    remove,
    toggleMutation,
    deleteMutation,
  };
}
