import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import { LoginPage } from "../login";

const mockLogin = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: mockLogin, logout: vi.fn(), token: null, isAuthenticated: false }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { auth: { verifyToken: { query: mockQuery } } },
}));

function renderLogin() {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/providers" element={<div>Providers Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockQuery.mockReset();
  });

  it("renders input and submit button", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Bearer token")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows error on empty token submission", async () => {
    renderLogin();
    await userEvent.click(screen.getByText("Sign In"));
    expect(screen.getByText("Token is required")).toBeInTheDocument();
  });

  it("successful login stores token and navigates", async () => {
    mockQuery.mockResolvedValueOnce({ valid: true });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Bearer token"), "valid-token");
    await userEvent.click(screen.getByText("Sign In"));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("valid-token");
    });
    await waitFor(() => {
      expect(screen.getByText("Providers Page")).toBeInTheDocument();
    });
  });

  it("failed login shows error message", async () => {
    mockQuery.mockResolvedValueOnce({ valid: false });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Bearer token"), "bad-token");
    await userEvent.click(screen.getByText("Sign In"));
    await waitFor(() => {
      expect(screen.getByText("Invalid token. Please check and try again.")).toBeInTheDocument();
    });
  });
});
