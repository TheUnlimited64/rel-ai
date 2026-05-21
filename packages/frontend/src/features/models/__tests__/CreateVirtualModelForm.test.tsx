import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { CreateVirtualModelForm } from "../components/CreateVirtualModelForm";

function renderForm(props?: { onSuccess?: () => void; onCancel?: () => void }) {
  return renderWithProviders(
    <CreateVirtualModelForm
      onSuccess={props?.onSuccess ?? vi.fn()}
      onCancel={props?.onCancel ?? vi.fn()}
    />,
  );
}

describe("CreateVirtualModelForm", () => {
  it("renders form fields in fallback mode", () => {
    renderForm();

    expect(screen.getByLabelText(/model id/i)).toBeInTheDocument();
    // Fallback toggle button
    expect(screen.getByRole("button", { name: "Fallback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tuned" })).toBeInTheDocument();
  });

  it("toggles to tuned mode", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Tuned" }));

    // Override textarea
    expect(screen.getByLabelText(/overrides/i)).toBeInTheDocument();
  });

  it("renders fallback chain builder in fallback mode", () => {
    renderForm();

    // "Fallback Chain" label
    expect(screen.getByText("Fallback Chain")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/model id/i)).toBeInTheDocument();
  });

  it("has cancel and create buttons", () => {
    renderForm();

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });
});
