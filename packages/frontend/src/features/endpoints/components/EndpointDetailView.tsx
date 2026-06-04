import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DetailViewProps {
  proxyUrl: string;
  models: { id: string; displayName: string }[];
  groups?: { id: string; name: string }[];
}

export function DetailView({ proxyUrl, models, groups = [] }: DetailViewProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">Proxy URL</span>
        <div className="col-span-2 flex items-center gap-2">
          <code className="text-xs break-all">{proxyUrl}</code>
          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(proxyUrl)}>Copy URL</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">Token</span>
        <div className="col-span-2 flex items-center gap-2">
          <code className="text-xs">••••••••</code>
          <span className="text-xs text-muted-foreground">Token only shown at creation</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">Models</span>
        <span className="col-span-2">
          {models.length === 0
            ? <span className="text-muted-foreground">None assigned</span>
            : models.map((m) => <Badge key={m.id} variant="secondary" className="mr-1">{m.displayName}</Badge>)
          }
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">Groups</span>
        <span className="col-span-2">
          {groups.length === 0
            ? <span className="text-muted-foreground">None assigned</span>
            : groups.map((g) => <Badge key={g.id} variant="outline" className="mr-1 font-mono">{g.name}</Badge>)
          }
        </span>
      </div>
    </div>
  );
}
