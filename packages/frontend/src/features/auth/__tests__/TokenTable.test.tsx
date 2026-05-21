import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenTable } from "../components/TokenTable";
import type { TokenResponse } from "../api";

const mockTokens: TokenResponse[] = [
  {
    id: "1",
    name: "my-laptop",
    createdAt: "2024-01-01T00:00:00Z",
    lastUsedAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "2",
    name: "phone",
    createdAt: "2024-02-01T00:00:00Z",
    lastUsedAt: null,
  },
];

describe("TokenTable", () => {
  it("renders table with tokens", () => {
    render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

    expect(screen.getByText("my-laptop")).toBeInTheDocument();
    expect(screen.getByText("phone")).toBeInTheDocument();
  });

  it("shows delete buttons for each token", () => {
    render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(2);
  });

  it("shows empty state when no tokens", () => {
    render(<TokenTable tokens={[]} onDelete={vi.fn()} />);

    expect(screen.getByText("No tokens yet")).toBeInTheDocument();
  });

  it("shows Never for tokens never used", () => {
    render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });
});
