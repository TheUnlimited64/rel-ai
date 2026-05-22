import { trpcReact as trpcHooks } from "@/lib/trpc";

export function useFirstRun() {
  const { data, isLoading } = trpcHooks.auth.isFirstRun.useQuery();
  const isFirstRun = data?.isFirstRun ?? false;
  return { isFirstRun, loading: isLoading };
}
