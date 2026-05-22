import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import { WizardFlow } from "../WizardFlow";

function renderWithRouter(ui: React.ReactElement) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WizardFlow", () => {
  it("renders step 1 — Add a Provider", () => {
    renderWithRouter(<WizardFlow onComplete={vi.fn()} />);

    expect(screen.getByText("Add a Provider")).toBeInTheDocument();
    expect(screen.getByText(/connect an ai provider/i)).toBeInTheDocument();
  });

  it("shows progress indicator", () => {
    renderWithRouter(<WizardFlow onComplete={vi.fn()} />);

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("shows skip button", () => {
    renderWithRouter(<WizardFlow onComplete={vi.fn()} />);

    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });
});
