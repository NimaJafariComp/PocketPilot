import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Button } from "./ui/button";

const DESKTOP_SIDEBAR_STORAGE_KEY = "pocketpilot.desktop-sidebar-collapsed";

export function AppLayout() {
  const location = useLocation();
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    setIsDesktopSidebarCollapsed(storedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(isDesktopSidebarCollapsed));
  }, [isDesktopSidebarCollapsed]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

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
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-[90] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-nav-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="absolute inset-y-0 left-0 z-[91] flex h-full w-64 max-w-[85vw] flex-col border-r border-sidebar-border bg-background shadow-2xl"
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
    </div>
  );
}
