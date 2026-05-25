import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderTable } from "../components/ProviderTable";
import type { ProviderResponse } from "../api";

const mockProviders: ProviderResponse[] = [
  {
    id: "1",
    name: "Test Provider",
    adapterType: "openai",
    baseUrl: "https://api.openai.com",
    maskedApiKey: "sk_test****",
    enabled: true,
    config: null,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Anthropic Provider",
    adapterType: "anthropic",
    baseUrl: "https://api.anthropic.com",
    maskedApiKey: "sk_ant****",
    enabled: false,
    config: null,
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
  },
];

describe("ProviderTable", () => {
  it("renders provider table with mock data", () => {
    render(
      <ProviderTable
        providers={mockProviders}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText("Test Provider")).toBeInTheDocument();
    expect(screen.getByText("Anthropic Provider")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
    expect(screen.getByText("anthropic")).toBeInTheDocument();
  });

  it("shows toggle and delete buttons", () => {
    render(
      <ProviderTable
        providers={mockProviders}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);

    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls onToggle when switch clicked", async () => {
    const onToggle = vi.fn();
    render(
      <ProviderTable
        providers={mockProviders}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    const switches = screen.getAllByRole("switch");
    await userEvent.click(switches[0]!);

    expect(onToggle).toHaveBeenCalledWith(mockProviders[0]);
  });

  it("shows empty state when no providers", () => {
    render(
      <ProviderTable
        providers={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onClickRow={vi.fn()}
      />,
    );

    expect(screen.getByText(/no providers configured/i)).toBeInTheDocument();
  });
});
