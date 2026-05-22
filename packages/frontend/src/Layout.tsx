import { Outlet, NavLink, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./lib/auth";
import { Button } from "./components/ui/button";
import { useFirstRun } from "./features/wizard/useFirstRun";

const navItems = [
  { to: "/providers", label: "Providers" },
  { to: "/endpoints", label: "Endpoints" },
  { to: "/models", label: "Models" },
  { to: "/logs", label: "Logs" },
  { to: "/tokens", label: "Tokens" },
] as const;

export function Layout() {
  const { logout } = useAuth();
  const { isFirstRun, loading: firstRunLoop } = useFirstRun();
  const dismissed = sessionStorage.getItem("wizardDismissed");

  return (
    <div className="flex h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar-background md:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-6">
          <h1 className="text-lg font-bold text-sidebar-foreground">RelAI</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 w-64 border-t border-sidebar-border p-4">
          <Button variant="ghost" size="default" className="w-full justify-start" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        {isFirstRun && !firstRunLoop && !dismissed && (
          <div className="flex items-center gap-3 border-b bg-muted/50 px-6 py-2 text-sm">
            <span className="flex-1">Setup incomplete — add a provider and token to get started.</span>
            <Link to="/providers">
              <Button variant="outline" size="sm">Complete Setup</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => sessionStorage.setItem("wizardDismissed", "1")}>
              Dismiss
            </Button>
          </div>
        )}
        <main className="flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
        <Toaster richColors closeButton />
      </div>
    </div>
  );
}
