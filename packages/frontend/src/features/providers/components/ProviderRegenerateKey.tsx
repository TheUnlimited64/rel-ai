import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { extractApiKeyRaw } from "../api";

interface ProviderRegenerateKeyProps {
  providerId: string;
  confirmOpen: boolean;
  onConfirmClose: () => void;
  onKeyRevealed: (key: string) => void;
}

export function ProviderRegenerateKey({
  providerId, confirmOpen, onConfirmClose, onKeyRevealed,
}: ProviderRegenerateKeyProps) {
  const regenerateMutation = trpcHooks.providers.regenerateApiKey.useMutation({
    onSuccess: async (result) => {
      onConfirmClose();
      const rawKey = extractApiKeyRaw(result);
      if (!rawKey) return;
      onKeyRevealed(rawKey);
    },
  });

  return (
    <Dialog open={confirmOpen} onOpenChange={(o) => { if (!o) onConfirmClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Regenerate API Key</DialogTitle></DialogHeader>
        <DialogDescription>This will invalidate the current API key. Continue?</DialogDescription>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onConfirmClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => regenerateMutation.mutate({ id: providerId })} disabled={regenerateMutation.isPending}>
            {regenerateMutation.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
