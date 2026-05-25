import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useEndpoints } from "../hooks/useEndpoints";
import { TestWrapper } from "@/test-utils";
import { server } from "@/test/msw/server";
import { mockEndpointList, mockEndpoint } from "@/test/msw/handlers";

describe("useEndpoints", () => {
  it("returns endpoints list after loading", async () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.endpoints).toHaveLength(1);
    expect(result.current.endpoints[0]?.name).toBe("Test EP");
  });

  it("shows loading state while fetching", () => {
    server.use(
      http.get("/api/trpc/endpoints.list", async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return HttpResponse.json({ result: { data: mockEndpointList } });
      }),
    );

    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    expect(result.current.loading).toBe(true);
  });

  it("returns null error when request succeeds", async () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  it("returns error when request fails", async () => {
    server.use(
      http.get("/api/trpc/endpoints.list", () =>
        HttpResponse.json(
          { error: { message: "Internal Server Error", code: -32000 } },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeTruthy();
  });

  it("update endpoint triggers mutation", async () => {
    const updated = { ...mockEndpoint, enabled: false };

    server.use(
      http.post("/api/trpc/endpoints.update", () =>
        HttpResponse.json({ result: { data: updated } }),
      ),
    );

    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.toggleEnabled(mockEndpoint);

    await waitFor(() =>
      expect(result.current.toggleMutation.isSuccess).toBe(true),
    );
  });

  it("delete endpoint triggers mutation", async () => {
    server.use(
      http.post("/api/trpc/endpoints.delete", () =>
        HttpResponse.json({ result: { data: undefined } }),
      ),
    );

    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.remove("endpoint-1");

    await waitFor(() =>
      expect(result.current.deleteMutation.isSuccess).toBe(true),
    );
  });

  it("exposes toggleIsPending from mutation", async () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.toggleIsPending).toBe("boolean");
  });
});
