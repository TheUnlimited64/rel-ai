import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { EndpointTable } from "../components/EndpointTable";
import type { EndpointListResponse } from "../api";

const mockEndpoints: EndpointListResponse[] = [
  {
    id: "1",
    name: "Test Endpoint",
    path: "test-ep",
    enabled: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    modelCount: 3,
    proxyBase: "http://localhost:3000/v1",
  },
  {
    id: "2",
    name: "Production EP",
    path: "prod",
    enabled: false,
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
    modelCount: 1,
    proxyBase: "http://localhost:3000/v1",
  },
];

describe("EndpointTable", () => {
  it("renders endpoints table", () => {
    renderWithProviders(<EndpointTable endpoints={mockEndpoints} onToggle={vi.fn()} onDelete={vi.fn()} onClickRow={vi.fn()} />);
    expect(screen.getByText("Test Endpoint")).toBeInTheDocument();
    expect(screen.getByText("Production EP")).toBeInTheDocument();
  });

  it("shows switches and delete buttons", () => {
    renderWithProviders(<EndpointTable endpoints={mockEndpoints} onToggle={vi.fn()} onDelete={vi.fn()} onClickRow={vi.fn()} />);
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  it("calls onToggle when switch clicked", async () => {
    const onToggle = vi.fn();
    renderWithProviders(<EndpointTable endpoints={mockEndpoints} onToggle={onToggle} onDelete={vi.fn()} onClickRow={vi.fn()} />);
    const switches = screen.getAllByRole("switch");
    await userEvent.click(switches[0]!);
    expect(onToggle).toHaveBeenCalledWith(mockEndpoints[0]);
  });

  it("shows empty state when no endpoints", () => {
    renderWithProviders(<EndpointTable endpoints={[]} onToggle={vi.fn()} onDelete={vi.fn()} onClickRow={vi.fn()} />);
    expect(screen.getByText(/no endpoints configured/i)).toBeInTheDocument();
  });

  it("calls onClickRow when row clicked", async () => {
    const onClickRow = vi.fn();
    renderWithProviders(<EndpointTable endpoints={mockEndpoints} onToggle={vi.fn()} onDelete={vi.fn()} onClickRow={onClickRow} />);
    await userEvent.click(screen.getByText("Test Endpoint"));
    expect(onClickRow).toHaveBeenCalledWith("1");
  });
});
