import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface ApiKeyRevealDialogProps {
  open: boolean;
  apiKey: string;
  onClose: () => void;
}

export function ApiKeyRevealDialog({ open, apiKey, onClose }: ApiKeyRevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New API Key</DialogTitle></DialogHeader>
        <DialogDescription>Save this API key — it won't be shown again.</DialogDescription>
        <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
          <span className="flex-1 break-all">{apiKey}</span>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(apiKey)}>Copy</Button>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
