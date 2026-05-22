import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpcReact as trpcHooks } from "@/lib/trpc";
import { ProviderForm } from "../providers/components/ProviderForm";
import { CreateRealModelForm } from "../models/components/CreateRealModelForm";
import { EndpointForm } from "../endpoints/components/EndpointForm";

type Step = "provider" | "model" | "endpoint" | "done";

const STEPS: { key: Step; title: string; description: string }[] = [
  { key: "provider", title: "Add a Provider", description: "Connect an AI provider like OpenAI or Anthropic by entering your API key." },
  { key: "model", title: "Add a Model", description: "Register a model from your provider to use with endpoints." },
  { key: "endpoint", title: "Create an Endpoint", description: "Create a proxy endpoint to access your models via a unified API." },
];

export function WizardFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("provider");
  const [createdEndpoint, setCreatedEndpoint] = useState<{ path: string; token: string } | null>(null);
  const utils = trpcHooks.useUtils();
  const navigate = useNavigate();

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function handleProviderSuccess() {
    utils.providers.list.invalidate();
    setStep("model");
  }

  function handleModelSuccess() {
    utils.models.list.invalidate();
    setStep("endpoint");
  }

  function handleEndpointSuccess(result: { path: string; token: string }) {
    utils.endpoints.list.invalidate();
    setCreatedEndpoint(result);
    setStep("done");
  }

  function handleFinish() {
    onComplete();
    navigate("/providers");
  }

  if (step === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You're all set! 🎉</CardTitle>
          <CardDescription>Your proxy endpoint is ready to use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {createdEndpoint && (
            <div className="space-y-2 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Proxy URL</p>
                <code className="text-sm">
                  {window.location.origin}/v1/{createdEndpoint.path}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium">Endpoint Token</p>
                <div className="flex items-center gap-2">
                  <code className="max-w-xs truncate text-sm">{createdEndpoint.token}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(createdEndpoint.token)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Button onClick={handleFinish}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = STEPS[stepIndex];

  if (!currentStep) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </div>
        <CardTitle>{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step content */}
        {step === "provider" && (
          <ProviderForm
            onSuccess={() => handleProviderSuccess()}
            onCancel={() => setStep("model")}
          />
        )}
        {step === "model" && (
          <CreateRealModelForm
            onSuccess={handleModelSuccess}
            onCancel={() => setStep("endpoint")}
          />
        )}
        {step === "endpoint" && (
          <EndpointForm
            onSuccess={handleEndpointSuccess}
            onCancel={handleFinish}
            skipLabel="Skip"
          />
        )}

        {/* Skip button for optional steps */}
        {stepIndex < STEPS.length - 1 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextStep = STEPS[stepIndex + 1];
                if (nextStep) setStep(nextStep.key);
                else handleFinish();
              }}
            >
              Skip for now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
