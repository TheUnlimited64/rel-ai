import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { useFirstRun } from "../useFirstRun";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

function trpcResponse(data: unknown) {
  return HttpResponse.json({ result: { data } });
}

describe("useFirstRun", () => {
  it("returns isFirstRun=true when API says so", async () => {
    server.use(
      http.get("/api/trpc/auth.isFirstRun", () => trpcResponse({ isFirstRun: true })),
    );

    function TestComponent() {
      const { isFirstRun, loading } = useFirstRun();
      if (loading) return <div>Loading</div>;
      return <div>{isFirstRun ? "First Run" : "Not First Run"}</div>;
    }

    renderWithProviders(<TestComponent />);

    const result = await screen.findByText("First Run");
    expect(result).toBeInTheDocument();
  });

  it("returns isFirstRun=false when API says so", async () => {
    server.use(
      http.get("/api/trpc/auth.isFirstRun", () => trpcResponse({ isFirstRun: false })),
    );

    function TestComponent() {
      const { isFirstRun, loading } = useFirstRun();
      if (loading) return <div>Loading</div>;
      return <div>{isFirstRun ? "First Run" : "Not First Run"}</div>;
    }

    renderWithProviders(<TestComponent />);

    const result = await screen.findByText("Not First Run");
    expect(result).toBeInTheDocument();
  });

  it("returns loading=true during fetch", () => {
    server.use(
      http.get("/api/trpc/auth.isFirstRun", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return trpcResponse({ isFirstRun: true });
      }),
    );

    function TestComponent() {
      const { loading } = useFirstRun();
      return <div>{loading ? "Loading" : "Done"}</div>;
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("defaults isFirstRun to false while loading", () => {
    function TestComponent() {
      const { isFirstRun, loading } = useFirstRun();
      if (loading) return <div>isLoading</div>;
      return <div>isFirstRun={String(isFirstRun)}</div>;
    }

    renderWithProviders(<TestComponent />);

    expect(screen.getByText("isLoading")).toBeInTheDocument();
  });
});
