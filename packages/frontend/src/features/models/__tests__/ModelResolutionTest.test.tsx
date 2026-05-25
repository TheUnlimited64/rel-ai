import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelResolutionTest } from "../ModelResolutionTest";
import { renderWithProviders } from "@/test-utils";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

function trpcResponse(data: unknown) {
  return HttpResponse.json({ result: { data } });
}

describe("ModelResolutionTest", () => {
  it("renders Test Resolution button", () => {
    renderWithProviders(<ModelResolutionTest modelId="gpt-4o" />);

    expect(screen.getByText("Test Resolution")).toBeInTheDocument();
  });

  it("shows resolution chain on successful test", async () => {
    const steps = [
      { modelId: "fallback-group", providerId: "openai-1", providerModel: "gpt-4o", adapterType: "openai" },
    ];
    server.use(
      http.post("/api/trpc/models.testResolution", () => trpcResponse({ steps })),
    );

    const user = (await import("@testing-library/user-event")).default;
    renderWithProviders(<ModelResolutionTest modelId="fallback-group" />);

    await user.click(screen.getByText("Test Resolution"));

    const stepText = await screen.findByText("Step 1");
    expect(stepText).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
  });

  it("shows resolution failed when steps empty", async () => {
    server.use(
      http.post("/api/trpc/models.testResolution", () => trpcResponse({ steps: [] })),
    );

    const user = (await import("@testing-library/user-event")).default;
    renderWithProviders(<ModelResolutionTest modelId="broken-model" />);

    await user.click(screen.getByText("Test Resolution"));

    const failMsg = await screen.findByText("Resolution failed");
    expect(failMsg).toBeInTheDocument();
  });
});
