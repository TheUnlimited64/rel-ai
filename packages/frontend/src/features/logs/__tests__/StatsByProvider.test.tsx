import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsByProvider } from "../components/StatsByProvider";

const mockData = [
  { id: "openai-1", count: 500, successRate: 0.95, avgLatencyMs: 300 },
  { id: "anthropic-1", count: 200, successRate: 0.88, avgLatencyMs: 450 },
];

const nullLatencyData = [
  { id: "unknown-1", count: 10, successRate: 0.5, avgLatencyMs: null },
];

describe("StatsByProvider", () => {
  it("renders provider stats table", () => {
    render(<StatsByProvider data={mockData} />);

    expect(screen.getByText("By Provider")).toBeInTheDocument();
    expect(screen.getByText("openai-1")).toBeInTheDocument();
    expect(screen.getByText("anthropi")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("300ms")).toBeInTheDocument();
    expect(screen.getByText("450ms")).toBeInTheDocument();
  });

  it("renders dash for null avgLatencyMs", () => {
    render(<StatsByProvider data={nullLatencyData} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<StatsByProvider data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows (unassigned) for undefined/empty id", () => {
    const data = [{ id: "", count: 5, successRate: 1, avgLatencyMs: 100 }];
    render(<StatsByProvider data={data} />);

    expect(screen.getByText("(unassigned)")).toBeInTheDocument();
  });
});
