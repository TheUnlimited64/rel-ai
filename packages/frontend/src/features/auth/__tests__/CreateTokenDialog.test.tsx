import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTokenDialog } from "../components/CreateTokenDialog";

describe("CreateTokenDialog", () => {
  it("renders dialog when open", () => {
    render(
      <CreateTokenDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.getByText("Create Token")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <CreateTokenDialog
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.queryByText("Create Token")).not.toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    render(
      <CreateTokenDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    const submitBtn = screen.getByText("Create");
    await user.click(submitBtn);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("calls onSubmit with valid name", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <CreateTokenDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
      />,
    );

    const input = screen.getByLabelText("Name");
    await user.type(input, "my-token");
    const submitBtn = screen.getByText("Create");
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("my-token");
  });
});
