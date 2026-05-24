import { test, expect } from "@playwright/test";

test.describe("Proxy endpoint", () => {
  test("SSE proxy request streams response", async ({ request }) => {
    const adminToken = "e2e-test-token-12345";
    const headers = {
      "Authorization": `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };

    // Create a real model linked to our test provider
    const modelId = `pm${Date.now().toString(36)}`;
    const createModelResp = await request.post("http://localhost:3999/api/trpc/models.createReal", {
      headers,
      data: {
        id: modelId,
        providerId: "e2e-test-provider",
        providerModel: "gpt-4",
      },
    });
    let resolvedModelId = modelId;
    const modelResult = await createModelResp.json();
    if (!modelResult.result?.data) {
      // Model creation failed (maybe ID collision), try with another
      resolvedModelId = `pm${Math.random().toString(36).slice(2, 6)}`;
      await request.post("http://localhost:3999/api/trpc/models.createReal", {
        headers,
        data: { id: resolvedModelId, providerId: "e2e-test-provider", providerModel: "gpt-4" },
      });
    }

    // Create an endpoint with this model
    const epPath = `px-${Date.now().toString(36)}`;
    const createResp = await request.post("http://localhost:3999/api/trpc/endpoints.create", {
      headers,
      data: {
        name: "Proxy Test EP",
        path: epPath,
        modelIds: [resolvedModelId],
      },
    });
    const createResult = await createResp.json();
    const endpoint = createResult.result?.data;
    const endpointToken = endpoint?.token;

    expect(endpointToken).toBeTruthy();

    // Make proxy request
    const response = await request.post(`http://localhost:3999/v1/${epPath}/chat/completions`, {
      headers: {
        "Authorization": `Bearer ${endpointToken}`,
        "Content-Type": "application/json",
      },
      data: {
        model: resolvedModelId,
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/event-stream");

    const body = await response.text();
    expect(body).toContain("Hello");
    expect(body).toContain("[DONE]");
  });
});
