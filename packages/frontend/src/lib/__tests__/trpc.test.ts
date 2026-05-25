import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { customFetch, resetRedirectLock } from "@/lib/trpc";

const originalLocation = window.location;

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>;
let locationHref: string;

function setLocation(pathname: string) {
  locationHref = "";
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      ...originalLocation,
      pathname,
      get href() { return locationHref; },
      set href(v: string) { locationHref = v; },
    },
  });
}

beforeEach(() => {
  localStorageMock = createLocalStorageMock();
  vi.stubGlobal("localStorage", localStorageMock);
  setLocation("/dashboard");
  resetRedirectLock();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("customFetch", () => {
  it("redirects to login on 401 and clears token", async () => {
    localStorageMock.setItem("rel_ai_token", "test-token");
    const response401 = new Response(null, { status: 401, statusText: "Unauthorized" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response401));

    await customFetch("/api/trpc/test");

    expect(localStorageMock.getItem("rel_ai_token")).toBeNull();
    expect(locationHref).toBe("/login");
  });

  it("preserves original error cause in network failure", async () => {
    const networkError = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    await expect(customFetch("/api/trpc/test")).rejects.toThrow(
      "Unable to connect to server. Is the backend running?"
    );
  });

  it("does not redirect on 401 when already on /login", async () => {
    setLocation("/login");

    const response401 = new Response(null, { status: 401, statusText: "Unauthorized" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response401));

    await customFetch("/api/trpc/test");

    expect(locationHref).toBe("");
  });

  it("returns non-401 responses without redirect", async () => {
    const response200 = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response200));

    const result = await customFetch("/api/trpc/test");
    expect(result.status).toBe(200);
    expect(locationHref).toBe("");
  });

  it("returns 500 response and logs warning", async () => {
    const response500 = new Response(null, { status: 500, statusText: "Internal Server Error" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response500));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await customFetch("/api/trpc/test");
    expect(result.status).toBe(500);
    expect(locationHref).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("HTTP 500")
    );
  });

  it("returns 403 response and logs warning", async () => {
    const response403 = new Response(null, { status: 403, statusText: "Forbidden" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response403));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await customFetch("/api/trpc/test");
    expect(result.status).toBe(403);
    expect(locationHref).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("HTTP 403")
    );
  });

  it("fires only one redirect for 3 concurrent 401 responses", async () => {
    localStorageMock.setItem("rel_ai_token", "old-token");

    const mock401 = new Response(null, { status: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mock401));

    const results = await Promise.all([
      customFetch("http://localhost/api/a"),
      customFetch("http://localhost/api/b"),
      customFetch("http://localhost/api/c"),
    ]);

    for (const r of results) {
      expect(r.status).toBe(401);
    }

    expect(locationHref).toBe("/login");
    expect(localStorageMock.getItem("rel_ai_token")).toBeNull();
  });

  it("preserves 401 response details for all concurrent callers", async () => {
    localStorageMock.setItem("rel_ai_token", "old-token");

    const mock401 = new Response("token expired", { status: 401, statusText: "Unauthorized" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mock401));

    const results = await Promise.all([
      customFetch("http://localhost/api/x"),
      customFetch("http://localhost/api/y"),
    ]);

    for (const r of results) {
      expect(r.status).toBe(401);
      expect(r.statusText).toBe("Unauthorized");
    }
  });

  it("allows redirect again after resetRedirectLock", async () => {
    localStorageMock.setItem("rel_ai_token", "old-token");

    const mock401 = new Response(null, { status: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mock401));

    await customFetch("http://localhost/api/first");
    expect(locationHref).toBe("/login");

    locationHref = "";
    resetRedirectLock();

    localStorageMock.setItem("rel_ai_token", "another-token");
    await customFetch("http://localhost/api/second");
    expect(locationHref).toBe("/login");
  });
});
