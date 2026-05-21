import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { StatsCards } from "../components/StatsCards";
import type { StatsData } from "../api";

const mockStats: StatsData = {
  totalRequests: 1500,
  successRate: 0.92,
  avgLatencyMs: 450,
  totalTokens: 120000,
  byProvider: [],
  byModel: [],
};

describe("StatsCards", () => {
  it("renders stat cards with mock data", () => {
    renderWithProviders(<StatsCards stats={mockStats} />);

    expect(screen.getByText("Total Requests")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("Avg Latency")).toBeInTheDocument();
    expect(screen.getByText("450ms")).toBeInTheDocument();
    expect(screen.getByText("Total Tokens")).toBeInTheDocument();
    expect(screen.getByText("120,000")).toBeInTheDocument();
  });

  it("renders dash for null avg latency", () => {
    const stats = { ...mockStats, avgLatencyMs: null };
    renderWithProviders(<StatsCards stats={stats} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
