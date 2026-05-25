import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  describe("masked token display", () => {
    it("does not render raw token values in the table", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      const tokenValues = screen.queryAllByText(/llmp_sk_/);
      expect(tokenValues).toHaveLength(0);
    });

    it("shows token names but not token strings", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      expect(screen.getByText("my-laptop")).toBeInTheDocument();
      expect(screen.getByText("phone")).toBeInTheDocument();
      expect(screen.queryByText(/sk_[a-z]+/)).not.toBeInTheDocument();
    });
  });

  describe("delete interaction", () => {
    it("calls onDelete with correct token id when Delete is clicked", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<TokenTable tokens={mockTokens} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByText("Delete");
      await user.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalledWith("1");
    });

    it("calls onDelete with second token id when its Delete is clicked", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<TokenTable tokens={mockTokens} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByText("Delete");
      await user.click(deleteButtons[1]);

      expect(onDelete).toHaveBeenCalledWith("2");
    });

    it("calls onDelete once per click", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<TokenTable tokens={mockTokens} onDelete={onDelete} />);

      await user.click(screen.getAllByText("Delete")[0]);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("date formatting", () => {
    it("shows createdAt as locale date string not ISO", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      const isoText = screen.queryByText("2024-01-01T00:00:00Z");
      expect(isoText).not.toBeInTheDocument();
    });

    it("shows lastUsedAt as locale date string not ISO", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      const isoText = screen.queryByText("2024-06-01T00:00:00Z");
      expect(isoText).not.toBeInTheDocument();
    });

    it("shows Never when lastUsedAt is null", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      expect(screen.getByText("Never")).toBeInTheDocument();
    });

    it("shows formatted date when lastUsedAt has value", () => {
      const tokenWithLastUsed: TokenResponse[] = [
        {
          id: "1",
          name: "active-token",
          createdAt: "2024-01-01T00:00:00Z",
          lastUsedAt: "2024-06-15T12:30:00Z",
        },
      ];

      render(<TokenTable tokens={tokenWithLastUsed} onDelete={vi.fn()} />);

      const neverText = screen.queryByText("Never");
      expect(neverText).not.toBeInTheDocument();
      const isoText = screen.queryByText("2024-06-15T12:30:00Z");
      expect(isoText).not.toBeInTheDocument();
    });
  });

  describe("table structure", () => {
    it("renders column headers", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Last Used")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders correct number of rows for tokens", () => {
      render(<TokenTable tokens={mockTokens} onDelete={vi.fn()} />);

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(mockTokens.length + 1);
    });

    it("renders single row plus header for one token", () => {
      render(<TokenTable tokens={[mockTokens[0]]} onDelete={vi.fn()} />);

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(2);
    });
  });

  describe("empty state", () => {
    it("renders single row with message when no tokens", () => {
      render(<TokenTable tokens={[]} onDelete={vi.fn()} />);

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(2);
    });

    it("shows No tokens yet message spanning all columns", () => {
      render(<TokenTable tokens={[]} onDelete={vi.fn()} />);

      const message = screen.getByText("No tokens yet");
      const cell = message.closest("td");
      expect(cell?.getAttribute("colspan")).toBe("4");
    });
  });
});
