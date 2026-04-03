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
    <aside className="hidden border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:flex lg:w-60 lg:flex-col">
      <div className="border-b border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-info to-primary text-primary-foreground shadow-md shadow-primary/20">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="block font-serif text-base font-medium tracking-tight">PocketPilot</span>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Finance</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
