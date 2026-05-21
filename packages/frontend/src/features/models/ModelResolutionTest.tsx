import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpcReact as trpcHooks } from "@/lib/trpc";

interface ModelResolutionTestProps {
  modelId: string;
}

export function ModelResolutionTest({ modelId }: ModelResolutionTestProps) {
  const [steps, setSteps] = useState<Array<{ modelId: string; providerId: string; providerModel: string; adapterType: string }> | null>(null);
  const mutation = trpcHooks.models.testResolution.useMutation({
    onSuccess: (result) => {
      setSteps(result.steps);
    },
    onError: () => {
      setSteps([]);
    },
  });

  function handleTest() {
    setSteps(null);
    mutation.mutate({ id: modelId });
  }

  return (
    <>
      <Button variant="outline" onClick={handleTest} disabled={mutation.isPending}>
        {mutation.isPending ? "Testing..." : "Test Resolution"}
      </Button>
      {steps !== null && (
        <Card>
          <CardHeader><CardTitle>Resolution Chain</CardTitle></CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-sm text-destructive">Resolution failed</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 rounded border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Step {i + 1}</span>
                    <span className="font-mono">{step.modelId}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{step.providerModel}</span>
                    <Badge variant="secondary">{step.adapterType}</Badge>
                    <span className="text-muted-foreground">(via {step.providerId})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
