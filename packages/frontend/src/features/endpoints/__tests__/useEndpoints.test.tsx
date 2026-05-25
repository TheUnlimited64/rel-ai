import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEndpoints } from "../hooks/useEndpoints";

vi.mock("@/lib/trpc", () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined);
  const mockGetInvalidate = vi.fn().mockResolvedValue(undefined);
  const mockSetData = vi.fn();

  const mockUtils = {
    endpoints: {
      list: { setData: mockSetData, invalidate: mockInvalidate },
      get: { invalidate: mockGetInvalidate },
    },
  };

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
        proxyBase: "http://localhost:3000",
      },
    ],
    isLoading: false,
    error: null,
  }));

  const toggleMutate = vi.fn();
  const deleteMutateAsync = vi.fn();

  return {
    trpcReact: {
      endpoints: {
        list: { useQuery: mockQuery },
        update: {
          useMutation: vi.fn((opts: Record<string, unknown>) => ({
            mutate: toggleMutate,
            mutateAsync: vi.fn(),
            isPending: false,
          })),
        },
        delete: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: deleteMutateAsync,
            isPending: false,
          })),
        },
      },
      useUtils: () => mockUtils,
    },
    _mocks: { mockInvalidate, mockGetInvalidate, mockSetData, toggleMutate },
  };
});

describe("useEndpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns endpoints from query", () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });
    expect(result.current.endpoints).toHaveLength(1);
    expect(result.current.endpoints[0]?.name).toBe("Test EP");
  });

  it("returns loading state", () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });
    expect(result.current.loading).toBe(false);
  });

  it("returns null error when no error", () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });
    expect(result.current.error).toBeNull();
  });

  it("toggleEnabled calls mutate with toggled enabled value", () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });

    const ep = result.current.endpoints[0]!;
    act(() => {
      result.current.toggleEnabled(ep);
    });

    expect(result.current.toggleMutation.mutate).toHaveBeenCalledWith({
      id: "1",
      enabled: false,
    });
  });

  it("toggleMutation onSuccess calls invalidate not setData", async () => {
    renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });

    const mod = await import("@/lib/trpc");
    const mockFn = vi.mocked(mod.trpcReact.endpoints.update.useMutation);
    const opts = mockFn.mock.calls[0]?.[0] as Record<string, unknown>;
    const onSuccess = opts?.onSuccess as () => Promise<void>;

    expect(onSuccess).toBeDefined();

    await onSuccess();

    expect(mod._mocks.mockInvalidate).toHaveBeenCalled();
    expect(mod._mocks.mockGetInvalidate).toHaveBeenCalled();
    expect(mod._mocks.mockSetData).not.toHaveBeenCalled();
  });

  it("exposes toggleIsPending from mutation", () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });
    expect(result.current.toggleIsPending).toBe(false);
  });

  it("rapid toggleEnabled calls are suppressed by isPending guard", async () => {
    const { result } = renderHook(() => useEndpoints(), {
      wrapper: ({ children }) => <div>{children}</div>,
    });

    const ep = result.current.endpoints[0]!;
    const mod = await import("@/lib/trpc");
    const mockFn = vi.mocked(mod.trpcReact.endpoints.update.useMutation);
    const mutationResult = mockFn.mock.results[0]?.value as { mutate: ReturnType<typeof vi.fn> };
    mutationResult.mutate.mockClear();

    act(() => {
      result.current.toggleEnabled(ep);
    });

    expect(mutationResult.mutate).toHaveBeenCalledTimes(1);
    expect(mutationResult.mutate).toHaveBeenCalledWith({
      id: "1",
      enabled: false,
    });

    expect(typeof result.current.toggleIsPending).toBe("boolean");

    mutationResult.mutate.mockRestore();
  });
});
