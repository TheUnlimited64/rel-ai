import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelTable } from "../components/ModelTable";
import type { ModelResponse } from "../api";

const mockRealModel: Extract<ModelResponse, { type: "real" }> = {
  id: "gpt-4o",
  displayName: "GPT-4o",
  type: "real",
  providerId: "openai-1",
  providerModel: "gpt-4o-2024-08-06",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockFallbackModel: Extract<ModelResponse, { type: "virtual"; variant: "fallback" }> = {
  id: "fallback-group",
  displayName: "Fallback Group",
  type: "virtual",
  variant: "fallback",
  fallbackChain: ["gpt-4o", "claude-3"],
  createdAt: "2024-01-02T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

const mockTunedModel: Extract<ModelResponse, { type: "virtual"; variant: "tuned" }> = {
  id: "gpt-4o-turbo",
  displayName: "GPT-4o Turbo",
  type: "virtual",
  variant: "tuned",
  baseModelId: "gpt-4o",
  overrides: { temperature: 0.7 },
  createdAt: "2024-01-03T00:00:00Z",
  updatedAt: "2024-01-03T00:00:00Z",
};

// Cast to ModelResponse[] for table props — tRPC inferred types are compatible
const mockModels = [mockRealModel, mockFallbackModel, mockTunedModel] as unknown as ModelResponse[];

describe("ModelTable", () => {
  it("renders model table with mock data", () => {
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("Fallback Group")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o Turbo")).toBeInTheDocument();
  });

  it("shows type badges", () => {
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText("Real")).toBeInTheDocument();
    expect(screen.getAllByText("Virtual")).toHaveLength(2);
  });

  it("shows variant badges for virtual models", () => {
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.getByText("Tuned")).toBeInTheDocument();
  });

  it("shows ID column (truncated)", () => {
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  it("shows delete buttons", () => {
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(3);
  });

  it("calls onClickRow when row clicked", async () => {
    const onClickRow = vi.fn();
    render(
      <ModelTable
        models={mockModels}
        onDelete={vi.fn()}
        onClickRow={onClickRow}
      />,
    );

    await userEvent.click(screen.getByText("GPT-4o"));
    expect(onClickRow).toHaveBeenCalledWith("gpt-4o");
  });

  it("calls onDelete when delete clicked", async () => {
    const onDelete = vi.fn();
    render(
      <ModelTable
        models={mockModels}
        onDelete={onDelete}
        onClickRow={vi.fn()}
      />,
    );

    const deleteButtons = screen.getAllByText("Delete");
    await userEvent.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith("gpt-4o");
  });

  it("shows empty state when no models", () => {
    render(
      <ModelTable
        models={[]}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText(/no models configured/i)).toBeInTheDocument();
  });
});
