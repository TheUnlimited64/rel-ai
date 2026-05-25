import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelDetailView } from "../ModelDetailView";
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

const mockTunedModelNoOverrides: Extract<ModelResponse, { type: "virtual"; variant: "tuned" }> = {
  id: "gpt-4o-plain",
  displayName: "GPT-4o Plain",
  type: "virtual",
  variant: "tuned",
  baseModelId: "gpt-4o",
  overrides: {},
  createdAt: "2024-01-04T00:00:00Z",
  updatedAt: "2024-01-04T00:00:00Z",
};

describe("ModelDetailView", () => {
  it("renders real model details — id, providerId, providerModel, dates", () => {
    render(<ModelDetailView model={mockRealModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("openai-1")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-2024-08-06")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Provider ID")).toBeInTheDocument();
    expect(screen.getByText("Provider Model")).toBeInTheDocument();
  });

  it("renders fallback model with fallback chain", () => {
    render(<ModelDetailView model={mockFallbackModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.getByText("Fallback Chain")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("claude-3")).toBeInTheDocument();
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("renders tuned model with base model and overrides", () => {
    render(<ModelDetailView model={mockTunedModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.getByText("Base Model")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("Overrides")).toBeInTheDocument();
    expect(screen.getByText(/temperature/)).toBeInTheDocument();
  });

  it("hides overrides section when overrides is empty", () => {
    render(<ModelDetailView model={mockTunedModelNoOverrides as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.getByText("Base Model")).toBeInTheDocument();
    expect(screen.queryByText("Overrides")).not.toBeInTheDocument();
  });

  it("renders created/updated dates", () => {
    render(<ModelDetailView model={mockRealModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(<ModelDetailView model={mockRealModel as ModelResponse} onDelete={onDelete} />);

    await userEvent.click(screen.getByText("Delete Model"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("does not show provider fields for virtual models", () => {
    render(<ModelDetailView model={mockFallbackModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.queryByText("Provider Model")).not.toBeInTheDocument();
  });

  it("does not show fallback chain for real models", () => {
    render(<ModelDetailView model={mockRealModel as ModelResponse} onDelete={vi.fn()} />);

    expect(screen.queryByText("Fallback Chain")).not.toBeInTheDocument();
  });
});
