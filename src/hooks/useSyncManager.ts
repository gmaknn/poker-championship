'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import {
  getAllPendingActions,
  deletePendingAction,
  PendingAction,
  clearExpiredCache,
} from '@/lib/offlineStorage';

export function useSyncManager() {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Compter les actions en attente au démarrage
  useEffect(() => {
    updatePendingCount();
  }, []);

  // Synchroniser quand la connexion revient
  useEffect(() => {
    if (isOnline) {
      syncPendingActions();
      clearExpiredCache();
    }
  }, [isOnline]);

  async function updatePendingCount() {
    try {
      const actions = await getAllPendingActions();
      setPendingCount(actions.length);
    } catch (error) {
      console.error('❌ Erreur lors du comptage des actions en attente:', error);
    }
  }

  async function syncPendingActions() {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const actions = await getAllPendingActions();

      if (actions.length === 0) {
        console.log('✅ Aucune action en attente à synchroniser');
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Synchronisation de ${actions.length} action(s) en attente...`);

      let successCount = 0;
      let errorCount = 0;

      for (const action of actions) {
        try {
          await executePendingAction(action);
          await deletePendingAction(action.id!);
          successCount++;
          console.log(`✅ Action synchronisée: ${action.type} ${action.endpoint}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Échec de synchronisation:`, error);

          // Si l'action a échoué plus de 3 fois, on la supprime
          if ((action.retryCount || 0) >= 3) {
            console.warn(`⚠️ Action abandonnée après 3 échecs:`, action);
            await deletePendingAction(action.id!);
          }
        }
      }

      if (errorCount > 0) {
        setSyncError(`${errorCount} action(s) n'ont pas pu être synchronisées`);
      }

      console.log(`✅ Synchronisation terminée: ${successCount}/${actions.length}`);
      await updatePendingCount();
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      setSyncError('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  }

  async function executePendingAction(action: PendingAction): Promise<void> {
    const method = action.type === 'DELETE' ? 'DELETE' : action.type === 'UPDATE' ? 'PATCH' : 'POST';

    const response = await fetch(action.endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: action.data ? JSON.stringify(action.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  return {
    isSyncing,
    syncError,
    pendingCount,
    syncNow: syncPendingActions,
  };
}
