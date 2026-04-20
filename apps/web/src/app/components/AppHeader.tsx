import { useEffect, useState } from 'react';
import { User, Menu, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router';
import { MobileSidebar } from './MobileSidebar';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';

interface AppHeaderProps {
  isDesktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
}

export function AppHeader({
  isDesktopSidebarCollapsed = false,
  onToggleDesktopSidebar,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/70 bg-background/72 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/62 lg:px-6">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsMobileNavOpen(true)}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-navigation"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleDesktopSidebar}
          aria-pressed={isDesktopSidebarCollapsed}
          aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isDesktopSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/12 text-primary">
                <User className="w-4 h-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="absolute inset-y-0 left-0 flex h-full w-64 max-w-[85vw] flex-col border-r border-sidebar-border bg-background shadow-lg"
          >
            <div className="sr-only">
              <h2 id="mobile-nav-title">Navigation Menu</h2>
              <p>Navigate between PocketPilot sections on mobile.</p>
            </div>
            <div className="flex items-center justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <MobileSidebar onNavigate={() => setIsMobileNavOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
