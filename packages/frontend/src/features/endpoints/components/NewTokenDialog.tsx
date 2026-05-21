import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface NewTokenDialogProps {
  token: string | null;
  onClose: () => void;
}

export function NewTokenDialog({ token, onClose }: NewTokenDialogProps) {
  return (
    <Dialog open={token !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Token</DialogTitle></DialogHeader>
        <DialogDescription>Copy the token below. This token will not be shown again.</DialogDescription>
        <div className="flex items-center gap-2 rounded border bg-muted p-3">
          <code className="flex-1 break-all text-sm">{token}</code>
          <Button variant="outline" size="sm" onClick={() => { if (token) navigator.clipboard.writeText(token); }}>Copy</Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
