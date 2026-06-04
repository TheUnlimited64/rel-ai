import { Outlet, NavLink, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./lib/auth";
import { Button } from "./components/ui/button";
import { useFirstRun } from "./features/wizard/useFirstRun";
import { Server, ArrowLeftRight, Layers, Activity, KeyRound, Zap, LogOut, BoxSelect } from "lucide-react";

const navItems = [
  { to: "/providers", label: "Providers", icon: Server },
  { to: "/endpoints", label: "Endpoints", icon: ArrowLeftRight },
  { to: "/models", label: "Models", icon: Layers },
  { to: "/model-groups", label: "Groups", icon: BoxSelect },
  { to: "/logs", label: "Logs", icon: Activity },
  { to: "/tokens", label: "Tokens", icon: KeyRound },
] as const;

export function Layout() {
  const { logout } = useAuth();
  const { isFirstRun, loading: firstRunLoop } = useFirstRun();
  const dismissed = sessionStorage.getItem("wizardDismissed");

  return (
    <div className="flex h-screen bg-background">
      <aside
        className="hidden w-56 shrink-0 border-r border-sidebar-border md:flex md:flex-col"
        style={{
          background: "var(--sidebar-background)",
          backgroundImage:
            "radial-gradient(circle, oklch(0.92 0.004 250 / 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{
              background: "oklch(0.73 0.19 62 / 0.12)",
              border: "1px solid oklch(0.73 0.19 62 / 0.3)",
            }}
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.18em] text-sidebar-foreground">
            RELAI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { borderLeft: "2px solid oklch(0.73 0.19 62)", paddingLeft: "10px" }
                    : {}
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {isFirstRun && !firstRunLoop && !dismissed && (
          <div className="flex items-center gap-3 border-b border-border px-6 py-2 text-sm" style={{ background: "oklch(0.73 0.19 62 / 0.06)" }}>
            <span className="flex-1 text-muted-foreground">
              Setup incomplete — add a provider and token to get started.
            </span>
            <Link to="/providers">
              <Button variant="outline" size="sm">
                Complete Setup
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sessionStorage.setItem("wizardDismissed", "1")}
            >
              Dismiss
            </Button>
          </div>
        )}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
        <Toaster richColors closeButton />
      </div>
    </div>
  );
}
