import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { LogTable } from "../components/LogTable";
import type { LogEntry } from "../api";

const mockLogs: LogEntry[] = [
  {
    id: "log-1",
    endpointId: "ep-12345678",
    requestedModel: "gpt-4",
    resolvedModel: "gpt-4-0613",
    providerId: "prov-12345678",
    promptTokens: 100,
    completionTokens: 50,
    latencyMs: 1200,
    status: "success",
    errorDetail: null,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "log-2",
    endpointId: "ep-87654321",
    requestedModel: "claude-3",
    resolvedModel: null,
    providerId: "prov-87654321",
    promptTokens: 0,
    completionTokens: 0,
    latencyMs: null,
    status: "error",
    errorDetail: "Rate limit exceeded",
    createdAt: "2024-01-15T11:00:00Z",
  },
];

describe("LogTable", () => {
  it("renders table with mock data", () => {
    renderWithProviders(
      <LogTable logs={mockLogs} expandedId={null} onToggleExpand={vi.fn()} />,
    );

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("claude-3")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows empty state when no logs", () => {
    renderWithProviders(
      <LogTable logs={[]} expandedId={null} onToggleExpand={vi.fn()} />,
    );

    expect(screen.getByText("No logs found")).toBeInTheDocument();
  });

  it("calls onToggleExpand when row clicked", async () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <LogTable logs={mockLogs} expandedId={null} onToggleExpand={onToggle} />,
    );

    const rows = screen.getAllByRole("row");
    // First row is header, second is first data row
    await userEvent.click(rows[1]!);
    expect(onToggle).toHaveBeenCalledWith("log-1");
  });

  it("shows expanded error detail when row expanded", () => {
    renderWithProviders(
      <LogTable logs={mockLogs} expandedId="log-2" onToggleExpand={vi.fn()} />,
    );

    expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
  });
});
