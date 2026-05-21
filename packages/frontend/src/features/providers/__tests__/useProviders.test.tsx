import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProviders } from "../hooks/useProviders";

// Mock the tRPC module
vi.mock("@/lib/trpc", () => {
  const mockQuery = vi.fn(() => ({
    data: [
      {
        id: "1",
        name: "Test",
        adapterType: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: "sk_****",
        enabled: true,
        config: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
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
    providers: {
      list: { setData: vi.fn(), invalidate: vi.fn() },
      get: { invalidate: vi.fn() },
    },
  };

  return {
    trpcReact: {
      providers: {
        list: { useQuery: mockQuery },
        update: { useMutation: mockMutation },
        delete: { useMutation: mockMutation },
      },
      useUtils: () => mockUtils,
    },
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useProviders", () => {
  it("returns providers from query", () => {
    const { result } = renderHook(() => useProviders(), { wrapper: createWrapper() });

    expect(result.current.providers).toHaveLength(1);
    expect(result.current.providers[0]?.name).toBe("Test");
  });

  it("returns loading state", () => {
    const { result } = renderHook(() => useProviders(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(false);
  });

  it("returns null error when no error", () => {
    const { result } = renderHook(() => useProviders(), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
  });
});
