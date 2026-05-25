import { describe, test, expect } from "bun:test";

describe("Module-level side effects", () => {
  test("importing index.ts does not trigger side effects (no console output)", async () => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const logCalls: unknown[] = [];
    const warnCalls: unknown[] = [];
    const errorCalls: unknown[] = [];

    console.log = (...args: unknown[]) => logCalls.push(args);
    console.warn = (...args: unknown[]) => warnCalls.push(args);
    console.error = (...args: unknown[]) => errorCalls.push(args);

    try {
      const mod = await import("../src/index.js");

      // The module should export functions but NOT have triggered init
      expect(typeof mod.initializeApp).toBe("function");
      expect(typeof mod.getApp).toBe("function");
      expect(typeof mod.getDb).toBe("function");
      expect(typeof mod.startServer).toBe("function");
      expect(typeof mod.createApp).toBe("function");

      // No console output should have occurred from the import itself
      expect(logCalls.length).toBe(0);
      expect(warnCalls.length).toBe(0);
      expect(errorCalls.length).toBe(0);

      // getApp/getDb should throw since initializeApp wasn't called
      expect(() => mod.getApp()).toThrow("App not initialized");
      expect(() => mod.getDb()).toThrow("DB not initialized");
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
  });

  test("importing trpc.ts does not trigger side effects", async () => {
    const originalLog = console.log;
    const logCalls: unknown[] = [];
    console.log = (...args: unknown[]) => logCalls.push(args);

    try {
      await import("../src/api/trpc.js");
      expect(logCalls.length).toBe(0);
    } finally {
      console.log = originalLog;
    }
  });
});
