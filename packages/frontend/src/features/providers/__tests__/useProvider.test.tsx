import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { trpcReact } from "@/lib/trpc";
import { TestWrapper } from "@/test-utils";
import { server } from "@/test/msw/server";
import { mockProvider } from "@/test/msw/handlers";

function useProvider(id: string) {
  return trpcReact.providers.get.useQuery({ id });
}

describe("useProvider", () => {
  it("returns provider after loading", async () => {
    const { result } = renderHook(() => useProvider("provider-1"), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.name).toBe("Test Provider");
  });

  it("shows loading state while fetching", () => {
    server.use(
      http.get("/api/trpc/providers.get", async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return HttpResponse.json({ result: { data: mockProvider } });
      }),
    );

    const { result } = renderHook(() => useProvider("provider-1"), {
      wrapper: TestWrapper,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("returns error when provider not found", async () => {
    server.use(
      http.get("/api/trpc/providers.get", () =>
        HttpResponse.json(
          { error: { message: "NOT_FOUND", code: -32000 } },
          { status: 404 },
        ),
      ),
    );

    const { result } = renderHook(() => useProvider("nonexistent"), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.error).toBeDefined();
  });
});
