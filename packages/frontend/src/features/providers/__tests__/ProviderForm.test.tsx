import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { ProviderForm } from "../components/ProviderForm";

function renderForm(props?: { onSuccess?: () => void; onCancel?: () => void }) {
  return renderWithProviders(
    <ProviderForm
      onSuccess={props?.onSuccess ?? vi.fn()}
      onCancel={props?.onCancel ?? vi.fn()}
    />,
  );
}

describe("ProviderForm", () => {
  it("renders form fields", () => {
    renderForm();

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/base url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    renderForm();

    const submitButton = screen.getByText("Create Provider");
    await userEvent.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(/required|must|invalid/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("accepts valid input without validation errors", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/name/i), "Test Provider");
    await userEvent.type(screen.getByLabelText(/base url/i), "https://api.openai.com");
    await userEvent.type(screen.getByLabelText(/api key/i), "sk-test-key-123");

    // No validation errors shown when fields are filled
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/must be a valid/i)).not.toBeInTheDocument();
  });
});
