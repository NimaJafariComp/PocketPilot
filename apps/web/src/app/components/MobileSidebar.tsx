import { LayoutDashboard, Receipt, Settings, Sparkles, Target, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Receipt, label: "Transactions", path: "/transactions" },
  { icon: Wallet, label: "Budgets", path: "/budgets" },
  { icon: Target, label: "Goals", path: "/goals" },
  { icon: Sparkles, label: "Insights", path: "/insights" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function MobileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="PocketPilot" className="h-9 w-9 rounded-2xl object-cover shadow-lg shadow-primary/20" />
          <div>
            <span className="block text-lg font-semibold tracking-tight">PocketPilot</span>
            <span className="text-xs text-muted-foreground">Finance cockpit</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "border-primary/20 bg-primary/12 text-primary shadow-sm shadow-primary/10"
                      : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
