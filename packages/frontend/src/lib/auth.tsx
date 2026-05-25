import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Navigate } from "react-router-dom";

interface AuthContextValue {
  isAuthenticated: boolean;
  isChecking: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (cancelled) return;
        setIsAuthenticated(res.ok);
        setIsChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setIsChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setIsAuthenticated(false);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isChecking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) return null;
  if (isAuthenticated) return <Navigate to="/providers" replace />;
  return <>{children}</>;
}
