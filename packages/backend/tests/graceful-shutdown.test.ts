import { describe, test, expect } from "bun:test";
import { startServer } from "../src/server.js";

function getPort(): number {
  return 30_000 + Math.floor(Math.random() * 10_000);
}

describe("Graceful shutdown", () => {
  test("returns 503 after shutdown triggered", async () => {
    const started = await startServer({ dbPath: ":memory:", port: getPort() });
    const url = started.url;

    const healthy = await fetch(`${url}/health`);
    expect(healthy.status).toBe(200);

    await started.triggerShutdown("SIGTERM");

    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(503);

    try { started.stop(); } catch { /* already stopped */ }
  });

  test("drains active connection before stopping", async () => {
    const started = await startServer({ dbPath: ":memory:", port: getPort() });
    const url = started.url;

    const responsePromise = fetch(`${url}/health`);
    // Yield to ensure request is dispatched before shutdown
    await new Promise((resolve) => setTimeout(resolve, 10));
    const shutdownPromise = started.triggerShutdown("SIGTERM");

    const res = await responsePromise;
    expect(res.status).toBe(200);

    await shutdownPromise;

    try { started.stop(); } catch { /* already stopped */ }
  });

  test("shuttingDown flag reflects state", async () => {
    const started = await startServer({ dbPath: ":memory:", port: getPort() });

    expect(started.shuttingDown).toBe(false);

    const shutdownPromise = started.triggerShutdown("SIGINT");
    expect(started.shuttingDown).toBe(true);

    await shutdownPromise;

    try { started.stop(); } catch { /* already stopped */ }
  });
});
