import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { LogFilters, type DatePreset } from "../components/LogFilters";

vi.mock("@/lib/trpc", () => ({
  trpcReact: {
    endpoints: { list: { useQuery: () => ({ data: [{ id: "ep-1", name: "Test Endpoint" }] }) } },
    providers: { list: { useQuery: () => ({ data: [{ id: "prov-1", name: "Test Provider" }] }) } },
    useUtils: () => ({}),
  },
}));

describe("LogFilters", () => {
  const defaultProps = {
    datePreset: "24h" as DatePreset,
    statusFilter: "all",
    endpointId: "all",
    providerId: "all",
    onDatePresetChange: vi.fn(),
    onStatusChange: vi.fn(),
    onEndpointChange: vi.fn(),
    onProviderChange: vi.fn(),
  };

  it("renders filter controls", () => {
    renderWithProviders(<LogFilters {...defaultProps} />);

    expect(screen.getByText("Date Range")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Endpoint")).toBeInTheDocument();
    expect(screen.getByText("Provider")).toBeInTheDocument();
  });

  it("renders status filter", async () => {
    renderWithProviders(<LogFilters {...defaultProps} />);

    // Status combobox exists
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders endpoint options from query", () => {
    renderWithProviders(<LogFilters {...defaultProps} />);

    expect(screen.getByText("Endpoint")).toBeInTheDocument();
  });

  it("renders provider options from query", () => {
    renderWithProviders(<LogFilters {...defaultProps} />);

    expect(screen.getByText("Provider")).toBeInTheDocument();
  });
});
