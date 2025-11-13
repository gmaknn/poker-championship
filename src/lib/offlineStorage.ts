// Système de stockage local avec IndexedDB pour le mode hors ligne

const DB_NAME = 'PokerChampionshipDB';
const DB_VERSION = 1;

// Types pour les stores
export interface PendingAction {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount?: number;
}

export interface CachedData {
  id: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

// Initialiser la base de données
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store pour les actions en attente de synchronisation
      if (!db.objectStoreNames.contains('pendingActions')) {
        const pendingStore = db.createObjectStore('pendingActions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('type', 'type', { unique: false });
      }

      // Store pour les données en cache (tournois, joueurs, etc.)
      if (!db.objectStoreNames.contains('cachedData')) {
        const cacheStore = db.createObjectStore('cachedData', { keyPath: 'id' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Store pour l'état du timer des blindes (critique pour le mode hors ligne)
      if (!db.objectStoreNames.contains('timerState')) {
        db.createObjectStore('timerState', { keyPath: 'tournamentId' });
      }

      console.log('✅ Base de données IndexedDB initialisée');
    };
  });
}

// Générique pour les opérations sur les stores
async function performStoreOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Actions en attente de synchronisation ============

export async function addPendingAction(action: Omit<PendingAction, 'id'>): Promise<number> {
  console.log('📝 Ajout d\'une action en attente:', action);
  return performStoreOperation<number>(
    'pendingActions',
    'readwrite',
    (store) => store.add(action)
  );
}

export async function getAllPendingActions(): Promise<PendingAction[]> {
  return performStoreOperation<PendingAction[]>(
    'pendingActions',
    'readonly',
    (store) => store.getAll()
  );
}

export async function deletePendingAction(id: number): Promise<void> {
  return performStoreOperation<void>(
    'pendingActions',
    'readwrite',
    (store) => store.delete(id)
  );
}

export async function clearPendingActions(): Promise<void> {
  return performStoreOperation<void>(
    'pendingActions',
    'readwrite',
    (store) => store.clear()
  );
}

// ============ Données en cache ============

export async function setCachedData(
  id: string,
  data: any,
  ttlMinutes?: number
): Promise<string> {
  const cachedData: CachedData = {
    id,
    data,
    timestamp: Date.now(),
    expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined,
  };

  return performStoreOperation<string>(
    'cachedData',
    'readwrite',
    (store) => store.put(cachedData)
  );
}

export async function getCachedData(id: string): Promise<any | null> {
  const cached = await performStoreOperation<CachedData | undefined>(
    'cachedData',
    'readonly',
    (store) => store.get(id)
  );

  if (!cached) return null;

  // Vérifier l'expiration
  if (cached.expiresAt && cached.expiresAt < Date.now()) {
    await deleteCachedData(id);
    return null;
  }

  return cached.data;
}

export async function deleteCachedData(id: string): Promise<void> {
  return performStoreOperation<void>(
    'cachedData',
    'readwrite',
    (store) => store.delete(id)
  );
}

export async function clearExpiredCache(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction('cachedData', 'readwrite');
  const store = transaction.objectStore('cachedData');
  const index = store.index('expiresAt');
  const now = Date.now();

  const request = index.openCursor();

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const cached: CachedData = cursor.value;
        if (cached.expiresAt && cached.expiresAt < now) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ============ État du timer ============

export interface TimerState {
  tournamentId: string;
  currentLevel: number;
  timeRemaining: number;
  isPaused: boolean;
  lastUpdated: number;
}

export async function saveTimerState(state: TimerState): Promise<void> {
  return performStoreOperation<void>(
    'timerState',
    'readwrite',
    (store) => store.put(state)
  );
}

export async function getTimerState(tournamentId: string): Promise<TimerState | null> {
  const state = await performStoreOperation<TimerState | undefined>(
    'timerState',
    'readonly',
    (store) => store.get(tournamentId)
  );

  return state || null;
}

export async function deleteTimerState(tournamentId: string): Promise<void> {
  return performStoreOperation<void>(
    'timerState',
    'readwrite',
    (store) => store.delete(tournamentId)
  );
}

// ============ Helpers pour les données spécifiques ============

// Tournois
export const TournamentCache = {
  set: (id: string, tournament: any) => setCachedData(`tournament:${id}`, tournament, 30),
  get: (id: string) => getCachedData(`tournament:${id}`),
  delete: (id: string) => deleteCachedData(`tournament:${id}`),
  setList: (tournaments: any[]) => setCachedData('tournaments:list', tournaments, 10),
  getList: () => getCachedData('tournaments:list'),
};

// Joueurs
export const PlayerCache = {
  set: (id: string, player: any) => setCachedData(`player:${id}`, player, 60),
  get: (id: string) => getCachedData(`player:${id}`),
  delete: (id: string) => deleteCachedData(`player:${id}`),
  setList: (players: any[]) => setCachedData('players:list', players, 30),
  getList: () => getCachedData('players:list'),
};

// Saisons
export const SeasonCache = {
  set: (id: string, season: any) => setCachedData(`season:${id}`, season, 60),
  get: (id: string) => getCachedData(`season:${id}`),
  delete: (id: string) => deleteCachedData(`season:${id}`),
  setList: (seasons: any[]) => setCachedData('seasons:list', seasons, 30),
  getList: () => getCachedData('seasons:list'),
};

// Initialiser la DB au démarrage (si dans le navigateur)
if (typeof window !== 'undefined') {
  openDB().catch((error) => {
    console.error('❌ Erreur lors de l\'initialisation de IndexedDB:', error);
  });
}
