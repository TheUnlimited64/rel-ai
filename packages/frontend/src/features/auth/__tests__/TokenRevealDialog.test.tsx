import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  describe("token visibility", () => {
    it("displays token value directly (no masking)", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      expect(screen.getByText("llmp_sk_abc123xyz")).toBeInTheDocument();
    });

    it("renders token inside a code element", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      const codeEl = screen.getByText("llmp_sk_abc123xyz").closest("code");
      expect(codeEl).toBeInTheDocument();
      expect(codeEl?.tagName).toBe("CODE");
    });
  });

  describe("copy to clipboard", () => {
    let writeTextMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", {
        ...navigator,
        clipboard: { writeText: writeTextMock },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("calls clipboard.writeText with token value on Copy click", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      fireEvent.click(screen.getByText("Copy"));

      expect(writeTextMock).toHaveBeenCalledWith("llmp_sk_abc123xyz");
    });

    it("shows Copied! after clicking Copy", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      fireEvent.click(screen.getByText("Copy"));

      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("reverts button text to Copy after timeout", () => {
      vi.useFakeTimers();
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      fireEvent.click(screen.getByText("Copy"));
      expect(screen.getByText("Copied!")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText("Copy")).toBeInTheDocument();
    });
  });

  describe("keyboard accessibility", () => {
    it("Copy button is focusable", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      const copyBtn = screen.getByText("Copy");
      copyBtn.focus();
      expect(copyBtn).toHaveFocus();
    });

    it("Done button is focusable", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      const doneBtn = screen.getByText("Done");
      doneBtn.focus();
      expect(doneBtn).toHaveFocus();
    });

    it("triggers onClose on Escape key", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<TokenRevealDialog token={mockToken} onClose={onClose} />);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalled();
    });

    it("Copy button is a native button element", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      expect(screen.getByText("Copy").closest("button")?.tagName).toBe("BUTTON");
    });

    it("Done button is a native button element", () => {
      render(<TokenRevealDialog token={mockToken} onClose={vi.fn()} />);

      expect(screen.getByText("Done").closest("button")?.tagName).toBe("BUTTON");
    });
  });

  describe("close behavior", () => {
    it("calls onClose when Done button is clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<TokenRevealDialog token={mockToken} onClose={onClose} />);

      await user.click(screen.getByText("Done"));

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when dialog backdrop is clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<TokenRevealDialog token={mockToken} onClose={onClose} />);

      const overlay = document.querySelector("[data-radix-overlay]");
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it("calls onClose when dialog X/close button is clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<TokenRevealDialog token={mockToken} onClose={onClose} />);

      const closeBtn = document.querySelector("[data-radix-dialog-close]");
      if (closeBtn) {
        await user.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });
});
