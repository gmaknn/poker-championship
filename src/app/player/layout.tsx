'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  PlayerSidebar,
  PlayerMobileHeader,
  PlayerMobileDrawer,
  PlayerBottomNav,
} from '@/components/layout/player-nav';

// Pages that should NOT have the layout (full-screen pages)
const noLayoutPages = ['/player/login'];

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if current page should skip the layout
  const shouldSkipLayout = noLayoutPages.some(page => pathname === page);

  // For login page, render without layout
  if (shouldSkipLayout) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <PlayerSidebar />

      {/* Mobile Drawer */}
      <PlayerMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <PlayerMobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Page content - with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <PlayerBottomNav />
      </div>
    </div>
  );
}
