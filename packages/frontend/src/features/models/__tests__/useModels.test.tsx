import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseDependents, useModels, type ModelTypeFilter } from "../useModels";
import { renderWithProviders } from "@/test-utils";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

function trpcResponse(data: unknown) {
  return HttpResponse.json({ result: { data } });
}

function modelsListHandler(data: unknown[]) {
  return http.get("/api/trpc/models.list", () => trpcResponse(data));
}

function modelsDeleteHandler() {
  return http.post("/api/trpc/models.delete", () => trpcResponse(undefined));
}

const mockModels = [
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    type: "real",
    providerId: "openai-1",
    providerModel: "gpt-4o-2024-08-06",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "fallback-group",
    displayName: "Fallback Group",
    type: "virtual",
    variant: "fallback",
    fallbackChain: ["gpt-4o", "claude-3"],
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "gpt-4o-turbo",
    displayName: "GPT-4o Turbo",
    type: "virtual",
    variant: "tuned",
    baseModelId: "gpt-4o",
    overrides: { temperature: 0.7 },
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("parseDependents", () => {
  it("returns dependents array from error data", () => {
    const error = { data: { dependents: ["model-a", "model-b"] } };
    expect(parseDependents(error)).toEqual(["model-a", "model-b"]);
  });

  it("returns null for error without dependents", () => {
    const error = { data: { message: "something failed" } };
    expect(parseDependents(error)).toBeNull();
  });

  it("returns null for non-object error", () => {
    expect(parseDependents("string error")).toBeNull();
    expect(parseDependents(null)).toBeNull();
    expect(parseDependents(undefined)).toBeNull();
  });

  it("returns null when dependents is not string array", () => {
    const error = { data: { dependents: [1, 2, 3] } };
    expect(parseDependents(error)).toBeNull();
  });
});

describe("useModels", () => {
  it("loads models list via tRPC", async () => {
    server.use(modelsListHandler(mockModels));

    function TestComponent() {
      const { models, loading, error } = useModels();
      if (loading) return <div>Loading</div>;
      if (error) return <div>Error: {error}</div>;
      return (
        <div>
          {models.map((m) => (
            <span key={m.id}>{m.displayName}</span>
          ))}
        </div>
      );
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByText("Loading")).toBeInTheDocument();

    const gpt4o = await screen.findByText("GPT-4o");
    expect(gpt4o).toBeInTheDocument();
    expect(screen.getByText("Fallback Group")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o Turbo")).toBeInTheDocument();
  });

  it("filters models by type=real", async () => {
    server.use(modelsListHandler(mockModels));

    function TestComponent() {
      const { models, setTypeFilter } = useModels();
      return (
        <div>
          <button onClick={() => setTypeFilter("real")}>Filter Real</button>
          {models.map((m) => (
            <span key={m.id} data-testid="model-name">{m.displayName}</span>
          ))}
        </div>
      );
    }

    renderWithProviders(<TestComponent />);
    await screen.findByText("GPT-4o");

    await import("@testing-library/user-event").then((m) =>
      m.default.click(screen.getByText("Filter Real")),
    );

    const displayed = screen.getAllByTestId("model-name");
    expect(displayed).toHaveLength(1);
    expect(displayed[0]).toHaveTextContent("GPT-4o");
  });

  it("filters models by type=virtual", async () => {
    server.use(modelsListHandler(mockModels));

    function TestComponent() {
      const { models, setTypeFilter } = useModels();
      return (
        <div>
          <button onClick={() => setTypeFilter("virtual")}>Filter Virtual</button>
          {models.map((m) => (
            <span key={m.id} data-testid="model-name">{m.displayName}</span>
          ))}
        </div>
      );
    }

    renderWithProviders(<TestComponent />);
    await screen.findByText("GPT-4o");

    await import("@testing-library/user-event").then((m) =>
      m.default.click(screen.getByText("Filter Virtual")),
    );

    const displayed = screen.getAllByTestId("model-name");
    expect(displayed).toHaveLength(2);
  });

  it("shows error when fetch fails", async () => {
    server.use(
      http.get("/api/trpc/models.list", () =>
        HttpResponse.json({ error: { message: "Server error", code: -32000 } }, { status: 500 }),
      ),
    );

    function TestComponent() {
      const { models, loading, error } = useModels();
      if (loading) return <div>Loading</div>;
      if (error) return <div>Error: {error}</div>;
      return <div>{models.length} models</div>;
    }

    renderWithProviders(<TestComponent />);

    const errorEl = await screen.findByText(/Error/);
    expect(errorEl).toBeInTheDocument();
  });
});
