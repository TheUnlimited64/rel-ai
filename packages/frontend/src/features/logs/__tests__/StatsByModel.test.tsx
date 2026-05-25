import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsByModel } from "../components/StatsByModel";

const mockData = [
  { id: "gpt-4o", count: 500, successRate: 0.95, avgLatencyMs: 300 },
  { id: "claude-3", count: 200, successRate: 0.88, avgLatencyMs: null },
];

describe("StatsByModel", () => {
  it("renders model stats table", () => {
    render(<StatsByModel data={mockData} />);

    expect(screen.getByText("By Model")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("claude-3")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("300ms")).toBeInTheDocument();
  });

  it("renders dash for null avgLatencyMs", () => {
    render(<StatsByModel data={mockData} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<StatsByModel data={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
