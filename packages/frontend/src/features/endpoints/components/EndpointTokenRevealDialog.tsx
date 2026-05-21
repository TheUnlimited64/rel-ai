import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface EndpointTokenRevealDialogProps {
  open: boolean;
  token: string;
  onClose: () => void;
}

export function EndpointTokenRevealDialog({ open, token, onClose }: EndpointTokenRevealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Endpoint Created</DialogTitle></DialogHeader>
        <DialogDescription>Save this token — it won't be shown again.</DialogDescription>
        <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
          <span className="flex-1 break-all">{token}</span>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(token)}>Copy</Button>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
