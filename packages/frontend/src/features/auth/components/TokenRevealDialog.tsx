import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CreateTokenResponse } from "../api";

interface TokenRevealDialogProps {
  token: CreateTokenResponse | null;
  onClose: () => void;
}

export function TokenRevealDialog({ token, onClose }: TokenRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={token !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token Created</DialogTitle>
          <DialogDescription>
            Copy the token below. This token will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              This token will not be shown again
            </p>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <p className="text-sm">{token.name}</p>
          </div>
          <div className="space-y-2">
            <Label>Token</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-xs font-mono break-all">
                {token.token}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
