import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth, RedirectIfAuth, useAuth } from "@/lib/auth";

function mockFetchImplementation(responses: Record<string, { ok: boolean; json: () => Promise<unknown> }>) {
  return vi.fn((url: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) return Promise.resolve(response);
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated user to /login", async () => {
    vi.stubGlobal("fetch", mockFetchImplementation({
      "/api/auth/me": { ok: false, json: () => Promise.resolve({ authenticated: false }) },
    }));

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={<RequireAuth><div>Protected Content</div></RequireAuth>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  it("shows content when session is valid", async () => {
    vi.stubGlobal("fetch", mockFetchImplementation({
      "/api/auth/me": { ok: true, json: () => Promise.resolve({ authenticated: true }) },
    }));

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={<RequireAuth><div>Protected Content</div></RequireAuth>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });
});

describe("RedirectIfAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when not authenticated", async () => {
    vi.stubGlobal("fetch", mockFetchImplementation({
      "/api/auth/me": { ok: false, json: () => Promise.resolve({ authenticated: false }) },
    }));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<RedirectIfAuth><div>Login Form</div></RedirectIfAuth>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Form")).toBeInTheDocument();
    });
  });

  it("redirects authenticated user to /providers", async () => {
    vi.stubGlobal("fetch", mockFetchImplementation({
      "/api/auth/me": { ok: true, json: () => Promise.resolve({ authenticated: true }) },
    }));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/providers" element={<div>Providers Page</div>} />
            <Route path="/login" element={<RedirectIfAuth><div>Login Form</div></RedirectIfAuth>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Providers Page")).toBeInTheDocument();
    });
  });
});

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /api/auth/me on mount and sets authenticated state", async () => {
    const fetchMock = mockFetchImplementation({
      "/api/auth/me": { ok: true, json: () => Promise.resolve({ authenticated: true }) },
    });
    vi.stubGlobal("fetch", fetchMock);

    function AuthStatus() {
      const { isAuthenticated, isChecking } = useAuth();
      return <span>{isChecking ? "checking" : isAuthenticated ? "authed" : "unauthed"}</span>;
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <AuthStatus />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("authed")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me");
  });

  it("login calls /api/auth/login with password", async () => {
    const fetchMock = vi.fn((url: string, opts?: RequestInit) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: true }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    function LoginButton() {
      const { login, isAuthenticated } = useAuth();
      return (
        <div>
          <span>{isAuthenticated ? "authed" : "unauthed"}</span>
          <button onClick={() => login("test-password")}>Login</button>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginButton />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("unauthed")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Login").click();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "test-password" }),
      }));
    });
  });
});
