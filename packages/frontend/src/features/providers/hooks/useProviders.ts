import { trpcReact as trpcHooks } from "@/lib/trpc";
import type { ProviderResponse } from "../api";

export function useProviders() {
  const query = trpcHooks.providers.list.useQuery();
  const utils = trpcHooks.useUtils();

  const toggleMutation = trpcHooks.providers.update.useMutation({
    onSuccess: async (updated) => {
      utils.providers.list.setData(undefined, (prev) =>
        prev ? prev.map((x) => (x.id === updated.id ? (updated as ProviderResponse) : x)) : prev,
      );
    },
  });

  const deleteMutation = trpcHooks.providers.delete.useMutation({
    onSuccess: async (_result, { id }) => {
      utils.providers.list.setData(undefined, (prev) =>
        prev ? prev.filter((x) => x.id !== id) : prev,
      );
    },
  });

  const remove = (id: string) => deleteMutation.mutateAsync({ id });

  return {
    providers: (query.data ?? []) as ProviderResponse[],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    reload: () => utils.providers.list.invalidate(),
    toggleEnabled: (p: ProviderResponse) => toggleMutation.mutate({ id: p.id, enabled: !p.enabled }),
    remove,
    toggleMutation,
    deleteMutation,
  };
}
