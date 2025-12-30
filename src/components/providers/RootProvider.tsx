'use client';

import { SessionProvider } from 'next-auth/react';
import { OfflineIndicator } from '../OfflineIndicator';
import { useSyncManager } from '@/hooks/useSyncManager';
import { ThemeProvider } from './ThemeProvider';
import { SocketProvider } from '@/contexts/SocketContext';

export function RootProvider({ children }: { children: React.ReactNode }) {
  // Démarrer le gestionnaire de synchronisation
  const { isSyncing, syncError, pendingCount } = useSyncManager();

  return (
    <SessionProvider>
      <ThemeProvider>
        <SocketProvider>
          <OfflineIndicator />
        {isSyncing && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-40 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Synchronisation en cours...</span>
        </div>
      )}
      {syncError && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-40 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top duration-300">
          {syncError}
        </div>
      )}
        {children}
        </SocketProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
