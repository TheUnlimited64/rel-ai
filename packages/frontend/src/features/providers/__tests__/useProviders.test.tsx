import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useProviders } from "../hooks/useProviders";
import { TestWrapper } from "@/test-utils";
import { server } from "@/test/msw/server";
import { mockProviderList, mockProvider } from "@/test/msw/handlers";

describe("useProviders", () => {
  it("returns providers list after loading", async () => {
    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.providers).toHaveLength(1);
    expect(result.current.providers[0]?.name).toBe("Test Provider");
  });

  it("shows loading state while fetching", () => {
    server.use(
      http.get("/api/trpc/providers.list", async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return HttpResponse.json({ result: { data: mockProviderList } });
      }),
    );

    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    expect(result.current.loading).toBe(true);
  });

  it("returns null error when request succeeds", async () => {
    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  it("returns error when request fails", async () => {
    server.use(
      http.get("/api/trpc/providers.list", () =>
        HttpResponse.json(
          { error: { message: "Internal Server Error", code: -32000 } },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeTruthy();
  });

  it("update provider triggers mutation", async () => {
    const updatedProvider = { ...mockProvider, enabled: false };

    server.use(
      http.post("/api/trpc/providers.update", () =>
        HttpResponse.json({ result: { data: updatedProvider } }),
      ),
    );

    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.toggleEnabled(mockProvider);

    await waitFor(() =>
      expect(result.current.toggleMutation.isSuccess).toBe(true),
    );
  });

  it("delete provider triggers mutation and removes from list", async () => {
    server.use(
      http.post("/api/trpc/providers.delete", () =>
        HttpResponse.json({ result: { data: undefined } }),
      ),
    );

    const { result } = renderHook(() => useProviders(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.providers).toHaveLength(1);

    await result.current.remove("provider-1");

    await waitFor(() =>
      expect(result.current.deleteMutation.isSuccess).toBe(true),
    );
  });
});
