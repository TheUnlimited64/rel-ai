import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { trpcReact } from "@/lib/trpc";
import { TestWrapper } from "@/test-utils";
import { server } from "@/test/msw/server";
import { mockCreateEndpoint } from "@/test/msw/handlers";

function useCreateEndpoint() {
  return trpcReact.endpoints.create.useMutation();
}

describe("useCreateEndpoint", () => {
  it("creates endpoint successfully", async () => {
    const { result } = renderHook(() => useCreateEndpoint(), {
      wrapper: TestWrapper,
    });

    result.current.mutate({
      name: "New EP",
      path: "new-ep",
      modelIds: [],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe("New EP");
    expect(result.current.data?.token).toBe("tok_new");
  });

  it("handles create error", async () => {
    server.use(
      http.post("/api/trpc/endpoints.create", () =>
        HttpResponse.json(
          { error: { message: "Bad Request", code: -32000 } },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateEndpoint(), {
      wrapper: TestWrapper,
    });

    result.current.mutate({
      name: "",
      path: "invalid path!",
      modelIds: [],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
