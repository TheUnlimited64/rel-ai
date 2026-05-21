/**
 * Test server for E2E tests.
 * Starts the RelAI backend on port 3999 with in-memory DB,
 * seeds a test admin token, creates a test provider pointing at a mock SSE server on port 4000.
 */
import { startServer } from "./server.js";
import { seedTestToken } from "./test-seed.js";
import { resetEncryptionKey, encrypt } from "./core/auth/encryption.js";
import { providers } from "./db/schema/index.js";
import { Hono } from "hono";

const TEST_PORT = 3999;
const MOCK_PROVIDER_PORT = 4000;
const ADMIN_TOKEN = "e2e-test-token-12345";

// --- Mock SSE Provider Server ---
const mockApp = new Hono();

mockApp.post("/v1/chat/completions", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const chunk1 = `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        choices: [{ delta: { content: "Hello" }, index: 0 }],
      })}\n\n`;
      const chunk2 = `data: [DONE]\n\n`;

      controller.enqueue(encoder.encode(chunk1));
      controller.enqueue(encoder.encode(chunk2));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

const mockServer = Bun.serve({ fetch: mockApp.fetch, port: MOCK_PROVIDER_PORT });
console.log(`[e2e] Mock provider server on http://localhost:${MOCK_PROVIDER_PORT}`);

// --- Start RelAI Backend ---
const { db, stop } = await startServer({ port: TEST_PORT, dbPath: ":memory:" });
console.log(`[e2e] RelAI backend on http://localhost:${TEST_PORT}`);

// --- Seed admin token ---
await seedTestToken(db, ADMIN_TOKEN);
console.log(`[e2e] Seeded admin token`);

// --- Seed test provider ---
resetEncryptionKey();
const encryptedKey = await encrypt("mock-api-key-not-needed");
db.insert(providers)
  .values({
    id: "e2e-test-provider",
    name: "E2E Test Provider",
    adapterType: "custom",
    baseUrl: `http://localhost:${MOCK_PROVIDER_PORT}/v1`,
    apiKey: encryptedKey,
    enabled: true,
  })
  .onConflictDoNothing()
  .run();
console.log(`[e2e] Seeded test provider`);

// --- Graceful shutdown ---
process.on("SIGINT", () => {
  mockServer.stop();
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  mockServer.stop();
  stop();
  process.exit(0);
});
