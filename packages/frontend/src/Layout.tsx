import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/providers", label: "Providers" },
  { to: "/endpoints", label: "Endpoints" },
  { to: "/models", label: "Models" },
  { to: "/logs", label: "Logs" },
  { to: "/tokens", label: "Tokens" },
] as const;

export function Layout() {
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
      </aside>
      <main className="flex-1 overflow-auto bg-background p-6">
        <Outlet />
      </main>
    </div>
  );
}
