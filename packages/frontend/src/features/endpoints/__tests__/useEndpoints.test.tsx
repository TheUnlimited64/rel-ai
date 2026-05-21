import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import React from "react";
import { useEndpoints } from "../hooks/useEndpoints";

vi.mock("@/lib/trpc", () => {
  const mockQuery = vi.fn(() => ({
    data: [
      {
        id: "1",
        name: "Test EP",
        path: "test-ep",
        enabled: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        modelCount: 2,
      },
    ],
    isLoading: false,
    error: null,
  }));

  const mockMutation = vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }));

  const mockUtils = {
    endpoints: {
      list: { setData: vi.fn(), invalidate: vi.fn() },
      get: { invalidate: vi.fn() },
    },
  };

  return {
    trpcReact: {
      endpoints: {
        list: { useQuery: mockQuery },
        update: { useMutation: mockMutation },
        delete: { useMutation: mockMutation },
      },
      useUtils: () => mockUtils,
    },
  };
});

describe("useEndpoints", () => {
  it("returns endpoints from query", () => {
    const { result } = renderHook(() => useEndpoints(), { wrapper: ({ children }) => <div>{children}</div> });
    expect(result.current.endpoints).toHaveLength(1);
    expect(result.current.endpoints[0]?.name).toBe("Test EP");
  });

  it("returns loading state", () => {
    const { result } = renderHook(() => useEndpoints(), { wrapper: ({ children }) => <div>{children}</div> });
    expect(result.current.loading).toBe(false);
  });

  it("returns null error when no error", () => {
    const { result } = renderHook(() => useEndpoints(), { wrapper: ({ children }) => <div>{children}</div> });
    expect(result.current.error).toBeNull();
  });
});
