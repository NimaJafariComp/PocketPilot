import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Sparkles,
  Settings,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Receipt, label: 'Transactions', path: '/transactions' },
  { icon: Wallet, label: 'Budgets', path: '/budgets' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: Sparkles, label: 'Insights', path: '/insights' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl lg:flex lg:w-64 lg:flex-col">
      <div className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-info to-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Wallet className="w-5 h-5 text-white" />
          </div>
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
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'border-primary/20 bg-primary/12 text-primary shadow-sm shadow-primary/10'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground'
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
    </aside>
  );
}
