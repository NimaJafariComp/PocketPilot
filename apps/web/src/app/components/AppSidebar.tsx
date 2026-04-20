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

interface AppSidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ collapsed = false, onNavigate }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`hidden border-r border-sidebar-border bg-sidebar/88 backdrop-blur-2xl shadow-[var(--surface-shadow)] transition-[width] duration-200 lg:flex lg:flex-col ${
        collapsed ? 'lg:w-20' : 'lg:w-60'
      }`}
    >
      <div className={`border-b border-sidebar-border py-5 ${collapsed ? 'px-4' : 'px-6'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-info to-primary text-primary-foreground shadow-md shadow-primary/20">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className={collapsed ? 'hidden' : 'block'}>
            <span className="block font-serif text-base font-medium tracking-tight">PocketPilot</span>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Finance</span>
          </div>
        </div>
      </div>
      <nav className={`flex-1 py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={`flex items-center rounded-md py-2.5 text-sm font-medium tracking-wide transition-all duration-150 ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
                  {isActive && !collapsed && (
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
