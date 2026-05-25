import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelDeleteDialog } from "../components/ModelDeleteDialog";

describe("ModelDeleteDialog", () => {
  it("renders delete confirmation when no dependents", () => {
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={null}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Delete Model")).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows dependent references when dependents provided", () => {
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={["model-a", "model-b"]}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/Cannot delete:/i)).toBeInTheDocument();
    expect(screen.getByText(/model-a, model-b/)).toBeInTheDocument();
    expect(screen.getByText(/Remove references first/)).toBeInTheDocument();
  });

  it("hides Delete button when dependents present", () => {
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={["model-a"]}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Close").length).toBeGreaterThan(0);
  });

  it("shows error message when errorMessage provided", () => {
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={null}
        errorMessage="Something went wrong"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it("calls onConfirm when Delete clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={null}
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange(false) when Cancel clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={onOpenChange}
        dependents={null}
        onConfirm={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Delete button when loading", () => {
    render(
      <ModelDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        dependents={null}
        onConfirm={vi.fn()}
        loading={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("does not render when open=false", () => {
    render(
      <ModelDeleteDialog
        open={false}
        onOpenChange={vi.fn()}
        dependents={null}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByText("Delete Model")).not.toBeInTheDocument();
  });
});
