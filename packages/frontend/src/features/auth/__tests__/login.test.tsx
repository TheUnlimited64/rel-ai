import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import { LoginPage } from "../login";

const mockLogin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: mockLogin, logout: vi.fn(), isAuthenticated: false, isChecking: false }),
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
  });

  it("renders password input and submit button", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Admin password")).toBeInTheDocument();
    expect(screen.getByText("Sign In →")).toBeInTheDocument();
  });

  it("shows error on empty password submission", async () => {
    renderLogin();
    await userEvent.click(screen.getByText("Sign In →"));
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("successful login calls login with password and navigates", async () => {
    mockLogin.mockResolvedValueOnce(true);
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Admin password"), "admin");
    await userEvent.click(screen.getByText("Sign In →"));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin");
    });
    await waitFor(() => {
      expect(screen.getByText("Providers Page")).toBeInTheDocument();
    });
  });

  it("failed login shows error message", async () => {
    mockLogin.mockResolvedValueOnce(false);
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Admin password"), "wrong");
    await userEvent.click(screen.getByText("Sign In →"));
    await waitFor(() => {
      expect(screen.getByText("Invalid password. Please try again.")).toBeInTheDocument();
    });
  });
});
