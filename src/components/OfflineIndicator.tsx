'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Afficher la bannière "hors ligne" quand pas de connexion
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span>Mode hors ligne - Les modifications seront synchronisées dès le retour de la connexion</span>
      </div>
    );
  }

  // Afficher brièvement un message de reconnexion
  if (wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300">
        <Wifi className="h-4 w-4" />
        <span>Connexion rétablie - Synchronisation en cours...</span>
      </div>
    );
  }

  return null;
}
