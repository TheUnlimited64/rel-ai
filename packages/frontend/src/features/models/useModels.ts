import { useState, useEffect, useCallback } from "react";
import type { ModelResponse } from "./api";
import { fetchModels, deleteModel } from "./api";

export type ModelTypeFilter = "all" | "real" | "virtual";

function parseDependents(error: unknown): string[] | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/HAS_DEPENDENTS:(.+)/);
  if (!match) return null;
  return (match[1] ?? "").split(",");
}

export function useModels() {
  const [models, setModels] = useState<ModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ModelTypeFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModels();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteModel(id);
      setModels((prev) => prev.filter((x) => x.id !== id));
      return null;
    } catch (err) {
      return parseDependents(err);
    }
  }, []);

  const filtered = models.filter((m) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "real") return m.type === "real";
    return m.type === "virtual";
  });

  return { models: filtered, loading, error, reload: load, remove, typeFilter, setTypeFilter };
}
