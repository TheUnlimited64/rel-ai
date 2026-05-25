import { describe, expect, it, vi } from "vitest";

const CONNECTION_ERROR_PATTERNS = ["Unable to connect", "Failed to fetch", "NetworkError"];

function isConnectionError(message: string) {
  return CONNECTION_ERROR_PATTERNS.some((p) => message.includes(p));
}

describe("isConnectionError", () => {
  it.each(CONNECTION_ERROR_PATTERNS)("detects '%s' as connection error", (pattern) => {
    expect(isConnectionError(pattern)).toBe(true);
  });

  it("detects pattern embedded in longer message", () => {
    expect(isConnectionError("Error: Failed to fetch resource")).toBe(true);
  });

  it("returns false for non-connection errors", () => {
    expect(isConnectionError("Internal Server Error")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isConnectionError("")).toBe(false);
  });
});

describe("query cache onError — background refetch suppression", () => {
  it("does not call toast when query has existing data (background refetch)", () => {
    const toastSpy = vi.fn();
    const onError = (error: Error, query: { state: { dataUpdatedAt: number } }) => {
      if (query.state.dataUpdatedAt > 0) return;
      if (isConnectionError(error.message)) {
        toastSpy();
      }
    };

    const error = new Error("Failed to fetch");
    const backgroundQuery = { state: { dataUpdatedAt: Date.now() } };
    const initialQuery = { state: { dataUpdatedAt: 0 } };

    onError(error, backgroundQuery);
    expect(toastSpy).not.toHaveBeenCalled();

    onError(error, initialQuery);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it("does not toast for non-connection errors even on initial load", () => {
    const toastSpy = vi.fn();
    const onError = (error: Error, query: { state: { dataUpdatedAt: number } }) => {
      if (query.state.dataUpdatedAt > 0) return;
      if (isConnectionError(error.message)) {
        toastSpy();
      }
    };

    onError(new Error("Internal Server Error"), { state: { dataUpdatedAt: 0 } });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("suppresses toast for connection error on background refetch", () => {
    const toastSpy = vi.fn();
    const onError = (error: Error, query: { state: { dataUpdatedAt: number } }) => {
      if (query.state.dataUpdatedAt > 0) return;
      if (isConnectionError(error.message)) {
        toastSpy();
      }
    };

    onError(new Error("Unable to connect"), { state: { dataUpdatedAt: 1000 } });
    expect(toastSpy).not.toHaveBeenCalled();
  });
});
