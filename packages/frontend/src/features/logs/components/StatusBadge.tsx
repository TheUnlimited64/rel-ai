import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
        {status}
      </Badge>
    );
  }
  if (status === "error") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  if (status === "rate_limited") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/25">
        rate_limited
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}
