import { useState, useEffect, useCallback } from "react";
import type { ProviderResponse } from "./api";
import { fetchProviders, updateProvider, deleteProvider } from "./api";

export function useProviders() {
  const [providers, setProviders] = useState<ProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProviders();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = useCallback(async (p: ProviderResponse) => {
    try {
      const updated = await updateProvider({ id: p.id, enabled: !p.enabled });
      setProviders((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch { /* optimistic — will reload */ }
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteProvider(id);
    setProviders((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { providers, loading, error, reload: load, toggleEnabled, remove };
}
