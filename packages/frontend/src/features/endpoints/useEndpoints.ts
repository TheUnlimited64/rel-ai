import { useState, useEffect, useCallback } from "react";
import type { EndpointListResponse } from "./api";
import { fetchEndpoints, updateEndpoint, deleteEndpoint } from "./api";

export function useEndpoints() {
  const [endpoints, setEndpoints] = useState<EndpointListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoints();
      setEndpoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load endpoints");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = useCallback(async (ep: EndpointListResponse) => {
    try {
      const updated = await updateEndpoint({ id: ep.id, enabled: !ep.enabled });
      setEndpoints((prev) =>
        prev.map((x) =>
          x.id === updated.id
            ? { ...x, enabled: updated.enabled, name: updated.name, path: updated.path, updatedAt: updated.updatedAt }
            : x,
        ),
      );
    } catch { /* optimistic — will reload */ }
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteEndpoint(id);
    setEndpoints((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { endpoints, loading, error, reload: load, toggleEnabled, remove };
}
