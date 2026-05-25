import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { trpcReact } from "@/lib/trpc";
import { TestWrapper } from "@/test-utils";
import { server } from "@/test/msw/server";
import { mockCreateProvider } from "@/test/msw/handlers";

function useCreateProvider() {
  return trpcReact.providers.create.useMutation();
}

describe("useCreateProvider", () => {
  it("creates provider successfully", async () => {
    const { result } = renderHook(() => useCreateProvider(), {
      wrapper: TestWrapper,
    });

    result.current.mutate({
      name: "New Provider",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-test-key",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe("New Provider");
    expect(result.current.data?.apiKeyRaw).toBe("sk-new-raw-key");
  });

  it("handles create error", async () => {
    server.use(
      http.post("/api/trpc/providers.create", () =>
        HttpResponse.json(
          { error: { message: "Bad Request", code: -32000 } },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateProvider(), {
      wrapper: TestWrapper,
    });

    result.current.mutate({
      name: "",
      adapterType: "openai",
      baseUrl: "not-a-url",
      apiKey: "",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
