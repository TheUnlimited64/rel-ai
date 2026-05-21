import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
        {status}
      </Badge>
    );
  }
  if (status === "error") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  if (status === "rate_limited") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
        rate_limited
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}
