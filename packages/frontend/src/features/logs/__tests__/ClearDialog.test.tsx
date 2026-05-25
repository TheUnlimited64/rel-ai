import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearDialog } from "../components/ClearDialog";

describe("ClearDialog", () => {
  it("renders dialog with title and description when open", () => {
    render(
      <ClearDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.getByText("Clear Old Logs")).toBeInTheDocument();
    expect(screen.getByText(/purge all old logs/i)).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(
      <ClearDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.queryByText("Clear Old Logs")).not.toBeInTheDocument();
  });

  it("calls onConfirm when Clear clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ClearDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );

    await userEvent.click(screen.getByText("Clear"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables Clear button when isPending=true", () => {
    render(
      <ClearDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={true}
      />,
    );

    expect(screen.getByText("Clear")).toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <ClearDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        isPending={false}
      />,
    );

    await userEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
