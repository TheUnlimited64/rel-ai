import { describe, it, expect } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth, RedirectIfAuth, useAuth } from "@/lib/auth";
import { server } from "@/test/msw/server";

describe("RequireAuth", () => {
  it("redirects unauthenticated user to /login", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: false }, { status: 401 }),
      ),
    );

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
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: true }),
      ),
    );

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
  it("renders children when not authenticated", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: false }, { status: 401 }),
      ),
    );

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
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: true }),
      ),
    );

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
  it("calls /api/auth/me on mount and sets authenticated state", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: true }),
      ),
    );

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
  });

  it("sets unauthenticated state when /api/auth/me fails", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: false }, { status: 401 }),
      ),
    );

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
      expect(screen.getByText("unauthed")).toBeInTheDocument();
    });
  });

  it("login calls /api/auth/login with password", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: false }, { status: 401 }),
      ),
      http.post("/api/auth/login", () =>
        HttpResponse.json({ authenticated: true }),
      ),
    );

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
      expect(screen.getByText("authed")).toBeInTheDocument();
    });
  });

  it("logout calls /api/auth/logout", async () => {
    let logoutCalled = false;

    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ authenticated: true }),
      ),
      http.post("/api/auth/logout", () => {
        logoutCalled = true;
        return HttpResponse.json({ ok: true });
      }),
    );

    function LogoutButton() {
      const { logout, isChecking } = useAuth();
      if (isChecking) return <span>checking</span>;
      return <button onClick={logout}>Logout</button>;
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("Logout").click();
    });

    await waitFor(() => {
      expect(logoutCalled).toBe(true);
    });
  });
});
