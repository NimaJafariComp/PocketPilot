import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'pocketpilot.desktop-sidebar-collapsed';

export function AppLayout() {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    setIsDesktopSidebarCollapsed(storedValue === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(isDesktopSidebarCollapsed));
  }, [isDesktopSidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-transparent">
      <AppSidebar
        collapsed={isDesktopSidebarCollapsed}
        onNavigate={() => setIsDesktopSidebarCollapsed(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed((current) => !current)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
