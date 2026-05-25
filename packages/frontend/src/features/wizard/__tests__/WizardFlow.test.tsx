import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import { WizardFlow } from "../WizardFlow";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

function trpcResponse(data: unknown) {
  return HttpResponse.json({ result: { data } });
}

function renderWizard(onComplete = vi.fn()) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<WizardFlow onComplete={onComplete} />} />
        <Route path="/providers" element={<div>Providers Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WizardFlow", () => {
  it("renders step 1 — Add a Provider", () => {
    renderWizard();
    expect(screen.getByText("Add a Provider")).toBeInTheDocument();
    expect(screen.getByText(/connect an ai provider/i)).toBeInTheDocument();
  });

  it("shows progress indicator Step 1 of 3", () => {
    renderWizard();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("shows skip button on non-last steps", () => {
    renderWizard();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("advances to step 2 when skip clicked on step 1", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      expect(screen.getByText("Add a Model")).toBeInTheDocument();
    });
  });

  it("advances to step 3 when skip clicked on step 2", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
      expect(screen.getByText("Create an Endpoint")).toBeInTheDocument();
    });
  });

  it("hides skip button on last step", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Skip for now")).not.toBeInTheDocument();
  });

  it("renders progress bar segments", () => {
    const { container } = renderWizard();

    const progressBar = container.querySelector(".flex.gap-1");
    expect(progressBar).toBeInTheDocument();

    const segments = progressBar!.querySelectorAll(".rounded-full");
    expect(segments).toHaveLength(3);
  });

  it("highlights progress bar — first filled, rest unfilled", () => {
    const { container } = renderWizard();

    const segments = container.querySelectorAll(".rounded-full");
    expect(segments).toHaveLength(3);

    expect(segments[0]).toHaveClass("bg-primary");
    expect(segments[1]).toHaveClass("bg-muted");
    expect(segments[2]).toHaveClass("bg-muted");
  });

  it("calls onComplete via Skip on step 3", async () => {
    const onComplete = vi.fn();
    renderWizard(onComplete);

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Skip"));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  it("navigates to /providers on finish", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Skip"));
    await waitFor(() => {
      expect(screen.getByText("Providers Dashboard")).toBeInTheDocument();
    });
  });

  it("shows step 1 description on step 1", () => {
    renderWizard();

    expect(screen.getByText(/connect an ai provider/i)).toBeInTheDocument();
  });

  it("shows step 2 description on step 2", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/register a model/i)).toBeInTheDocument();
    });
  });

  it("shows endpoint form on step 3", async () => {
    renderWizard();

    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Skip for now"));
    await waitFor(() => {
      expect(screen.getByText("Create an Endpoint")).toBeInTheDocument();
    });
  });
});
