import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenRevealDialog } from "../components/TokenRevealDialog";

const mockToken = {
  id: "00000000-0000-0000-0000-000000000001" as const,
  name: "my-laptop",
  token: "llmp_sk_abc123xyz",
};

describe("TokenRevealDialog", () => {
  it("renders token value and name", () => {
    render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

    expect(screen.getByText("my-laptop")).toBeInTheDocument();
    expect(screen.getByText("llmp_sk_abc123xyz")).toBeInTheDocument();
  });

  it("shows copy button", () => {
    render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("shows warning text", () => {
    render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

    const warnings = screen.getAllByText(/This token will not be shown again/i);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders nothing when token is null", () => {
    const { container } = render(<TokenRevealDialog token={null} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe("");
  });

  it("shows Done button", () => {
    render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});
