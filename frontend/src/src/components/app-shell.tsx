import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Calendar, LayoutGrid, TrendingUp } from "lucide-react";
export function AppShell() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { to: "/", label: "Content", icon: LayoutGrid, active: path === "/" },
    { to: "/schedule", label: "Schedule", icon: Calendar, active: path === "/schedule" },
    { to: "/analytics", label: "Analytics", icon: TrendingUp, active: path === "/analytics" },
  ];

  return (
    <div className="flex min-h-dvh w-full bg-canvas text-ink p-3 md:p-4 gap-3 md:gap-4">
      <nav className="hidden md:flex w-[240px] shrink-0 bg-paper rounded-2xl lux-border lux-shadow flex-col p-6">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="text-center">
            <span className="font-display text-2xl tracking-tight text-brand-charcoal" style={{ fontWeight: 600 }}>
              Kite By A&S
            </span>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">where content takes flight</div>
          </div>
          
        </Link>

        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 px-4">
          Menu
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  item.active
                    ? "bg-brand-blush lux-border rounded-xl px-4 py-3 font-medium text-sm flex items-center gap-3 text-brand-charcoal"
                    : "px-4 py-3 font-medium text-sm text-ink/50 hover:text-ink hover:bg-brand-cream/50 rounded-xl transition-colors flex items-center gap-3"
                }
              >
                <Icon className="size-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-brand-cream/50 lux-border">
          <div className="size-9 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-display text-sm" style={{ fontWeight: 600 }}>
            A
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm leading-tight truncate">Amyrah Luxe</div>
            <div className="text-xs text-muted-foreground leading-tight">The Collective</div>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-paper lux-border border-t-0 border-l-0 border-r-0 px-4 py-3 flex items-center justify-between">
        <span className="font-display text-lg text-brand-charcoal" style={{ fontWeight: 600 }}>
          amyrah luxe
        </span>
        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                item.active
                  ? "bg-brand-blush lux-border rounded-lg px-3 py-1.5 font-medium text-xs"
                  : "px-3 py-1.5 font-medium text-xs text-ink/50"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 min-w-0 flex flex-col mt-14 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
