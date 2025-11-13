'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('🌐 Connexion rétablie');
      setIsOnline(true);
      setWasOffline(true);

      // Reset wasOffline après 5 secondes pour masquer le message de reconnexion
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      console.log('📴 Connexion perdue - Mode hors ligne activé');
      setIsOnline(false);
    };

    // Écouter les événements de connexion
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
