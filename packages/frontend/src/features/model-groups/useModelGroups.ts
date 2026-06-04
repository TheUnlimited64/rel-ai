import { trpcReact as trpcHooks } from "@/lib/trpc";
import { formatMutationError } from "@/lib/format-error";

export function useModelGroups() {
  const utils = trpcHooks.useUtils();
  const query = trpcHooks.modelGroups.list.useQuery();
  const deleteMutation = trpcHooks.modelGroups.delete.useMutation({
    onSuccess: () => utils.modelGroups.list.invalidate(),
  });

  async function remove(id: string): Promise<string | null> {
    try {
      await deleteMutation.mutateAsync({ id });
      return null;
    } catch (e) {
      return formatMutationError(e as Parameters<typeof formatMutationError>[0]);
    }
  }

  return {
    groups: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    reload: () => utils.modelGroups.list.invalidate(),
    remove,
    deleteMutation,
  };
}
