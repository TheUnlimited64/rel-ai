import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface EndpointRegenerateTokenProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndpointRegenerateConfirm({ open, onConfirm, onCancel }: EndpointRegenerateTokenProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Regenerate Token</DialogTitle></DialogHeader>
        <DialogDescription>This will invalidate the current token. Any clients using it will need to be updated.</DialogDescription>
        <p className="text-sm text-muted-foreground">
          Continue?
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Regenerate</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
