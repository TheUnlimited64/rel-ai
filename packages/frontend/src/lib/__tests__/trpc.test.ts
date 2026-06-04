import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { customFetch } from "@/lib/trpc";

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => { toastErrorMock(...args); } },
}));

const originalLocation = window.location;
let locationHref: string;

function setLocation(pathname: string) {
  locationHref = "";
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: Object.assign(Object.create(null) as object, originalLocation, {
      pathname,
      get href() { return locationHref; },
      set href(v: string) { locationHref = v; },
    }),
  });
}

beforeEach(() => {
  setLocation("/dashboard");
  toastErrorMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("customFetch", () => {
  it("shows toast on 401 and does NOT redirect", async () => {
    const response401 = new Response(null, { status: 401, statusText: "Unauthorized" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response401));

    await customFetch("/api/trpc/test");

    expect(toastErrorMock).toHaveBeenCalledWith("Session expired. Please sign in again.");
    expect(locationHref).toBe("");
  });

  it("does not show toast on 401 when on /login page", async () => {
    setLocation("/login");
    const response401 = new Response(null, { status: 401, statusText: "Unauthorized" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response401));

    await customFetch("/api/trpc/test");

    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(locationHref).toBe("");
  });

  it("preserves original error cause in network failure", async () => {
    const networkError = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    await expect(customFetch("/api/trpc/test")).rejects.toThrow(
      "Unable to connect to server. Is the backend running?"
    );
  });

  it("returns non-401 responses without toast or redirect", async () => {
    const response200 = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response200));

    const result = await customFetch("/api/trpc/test");
    expect(result.status).toBe(200);
    expect(locationHref).toBe("");
    expect(toastErrorMock).not.toHaveBeenCalled();
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

  it("does not redirect even for multiple 401 responses", async () => {
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

    expect(locationHref).toBe("");
  });
});
