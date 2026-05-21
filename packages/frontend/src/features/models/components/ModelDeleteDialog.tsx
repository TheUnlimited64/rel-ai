import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ModelDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependents: string[] | null;
  errorMessage?: string | null;
  onConfirm: () => void;
  loading?: boolean;
}

export function ModelDeleteDialog({ open, onOpenChange, dependents, errorMessage, onConfirm, loading }: ModelDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Model</DialogTitle>
          <DialogDescription>
            {dependents
              ? "This model is referenced by other models and cannot be deleted."
              : "This action cannot be undone. This will permanently delete the model."}
          </DialogDescription>
        </DialogHeader>
        {dependents ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Cannot delete: this model is referenced by other models.</p>
            <p className="text-sm text-muted-foreground">Dependents: {dependents.join(", ")}</p>
            <p className="text-sm text-muted-foreground">Remove references first, then try again.</p>
          </div>
        ) : errorMessage ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Delete failed: {errorMessage}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this model?</p>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {dependents ? "Close" : "Cancel"}
          </Button>
          {!dependents && (
            <Button variant="destructive" onClick={onConfirm} disabled={loading}>
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
