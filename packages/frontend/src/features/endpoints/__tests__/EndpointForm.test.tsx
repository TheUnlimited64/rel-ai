import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { EndpointForm } from "../components/EndpointForm";

function renderForm(props?: { onSuccess?: () => void; onCancel?: () => void }) {
  return renderWithProviders(
    <EndpointForm onSuccess={props?.onSuccess ?? vi.fn()} onCancel={props?.onCancel ?? vi.fn()} />,
  );
}

describe("EndpointForm", () => {
  it("renders form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/path/i)).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    renderForm();
    await userEvent.click(screen.getByText("Create"));
    await waitFor(() => {
      const errors = screen.getAllByText(/required|must|only/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("shows path validation error for invalid input", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/path/i), "INVALID PATH");
    await userEvent.click(screen.getByText("Create"));
    await waitFor(() => {
      expect(screen.getByText(/must be lowercase/i)).toBeInTheDocument();
    });
  });

  it("accepts valid input without validation errors", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/name/i), "My Endpoint");
    await userEvent.type(screen.getByLabelText(/path/i), "my-endpoint");
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/must be lowercase/i)).not.toBeInTheDocument();
  });
});
