import { trpcReact as trpcHooks } from "@/lib/trpc";
import { RealModelEdit } from "./RealModelEdit";
import { FallbackModelEdit } from "./FallbackModelEdit";
import { TunedModelEdit } from "./TunedModelEdit";
import type { ModelResponse } from "./api";

type UpdateModelInput = Parameters<typeof trpcHooks.models.update.useMutation>[0] & Record<string, unknown>;

interface ModelEditFormProps {
  model: ModelResponse;
  onSave: (input: UpdateModelInput) => Promise<void>;
  onCancel: () => void;
}

export function ModelEditForm({ model, onSave, onCancel }: ModelEditFormProps) {
  const { data: allModels } = trpcHooks.models.list.useQuery();

  if (model.type === "real") {
    return (
      <RealModelEdit
        modelId={model.id}
        defaultDisplayName={model.displayName}
        defaultProviderModel={model.providerModel}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  if (model.type === "virtual" && model.variant === "fallback") {
    return (
      <FallbackModelEdit
        modelId={model.id}
        defaultDisplayName={model.displayName}
        defaultChain={model.fallbackChain}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  if (model.type === "virtual" && model.variant === "tuned") {
    return (
      <TunedModelEdit
        modelId={model.id}
        defaultDisplayName={model.displayName}
        defaultBaseModelId={model.baseModelId}
        defaultOverrides={model.overrides}
        allModels={allModels ?? []}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  return null;
}
