import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { CreateRealModelForm } from "../components/CreateRealModelForm";

function renderForm(props?: { onSuccess?: () => void; onCancel?: () => void }) {
  return renderWithProviders(
    <CreateRealModelForm
      onSuccess={props?.onSuccess ?? vi.fn()}
      onCancel={props?.onCancel ?? vi.fn()}
    />,
  );
}

describe("CreateRealModelForm", () => {
  it("renders form fields", () => {
    renderForm();

    expect(screen.getByLabelText(/model id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/provider model name/i)).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    renderForm();

    const submitButton = screen.getByText("Create");
    await userEvent.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("accepts valid input without validation errors", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/model id/i), "gpt-4o");
    await userEvent.type(screen.getByLabelText(/display name/i), "GPT-4o");
    await userEvent.type(screen.getByLabelText(/provider model name/i), "gpt-4o-2024-08-06");

    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
  });
});
