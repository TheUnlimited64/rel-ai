import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { trpcReact as trpcHooks } from "@/lib/trpc";

interface ProviderConnectionTestProps {
  providerId: string;
}

export function ProviderConnectionTest({ providerId }: ProviderConnectionTestProps) {
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; latencyMs: number } | null>(null);

  const testMutation = trpcHooks.providers.testConnection.useMutation({
    onSuccess: (result) => { setTestResult(result); },
    onError: () => { setTestResult({ success: false, error: "Request failed", latencyMs: 0 }); },
  });

  function handleTest() {
    setTestResult(null);
    testMutation.mutate({ id: providerId });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Connection Test</CardTitle>
        <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
          {testMutation.isPending ? "Testing..." : "Test Connection"}
        </Button>
      </CardHeader>
      {testResult && (
        <CardContent>
          {testResult.success ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Connected successfully ({testResult.latencyMs}ms)
            </p>
          ) : (
            <p className="text-sm text-destructive">
              ✗ {testResult.error ?? "Connection failed"} ({testResult.latencyMs}ms)
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
