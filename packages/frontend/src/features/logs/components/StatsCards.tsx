import { Card, CardContent } from "@/components/ui/card";
import type { StatsData } from "../api";

export function StatsCards({ stats }: { stats: StatsData }) {
  const cards = [
    { label: "Total Requests", value: stats.totalRequests.toLocaleString() },
    { label: "Success Rate", value: `${Math.round(stats.successRate * 100)}%` },
    { label: "Avg Latency", value: stats.avgLatencyMs != null ? `${stats.avgLatencyMs}ms` : "—" },
    { label: "Total Tokens", value: stats.totalTokens.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
