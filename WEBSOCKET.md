# 🔌 WebSocket - Documentation Temps Réel

## Vue d'ensemble

L'application utilise **Socket.IO** pour fournir des mises à jour en temps réel sur les tournois de poker.

### Architecture

```
┌─────────────────────┐
│   React Client      │
│  (SocketProvider)   │
└──────────┬──────────┘
           │ Socket.IO
           │ /api/socketio
┌──────────▼──────────┐
│  Custom Next.js     │
│  Server (server.js) │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   API Routes        │
│  emitToTournament() │
└─────────────────────┘
```

## 🚀 Démarrage

Le serveur WebSocket démarre automatiquement avec :

\`\`\`bash
npm run dev
\`\`\`

Le serveur écoute sur :
- **HTTP**: http://localhost:3003
- **WebSocket**: ws://localhost:3003/api/socketio

## 📡 Événements Disponibles

### Timer Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `timer:started` | `{ tournamentId, startedAt, currentLevel }` | Timer démarré |
| `timer:paused` | `{ tournamentId, pausedAt, elapsedSeconds }` | Timer mis en pause |
| `timer:resumed` | `{ tournamentId, resumedAt }` | Timer repris |
| `timer:level_change` | `{ tournamentId, newLevel, smallBlind, bigBlind, ante? }` | Changement de niveau |
| `timer:sync` | `{ tournamentId, currentLevel, remainingSeconds, isRunning }` | Synchronisation (chaque seconde) |

### Elimination Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `elimination:player_out` | `{ tournamentId, eliminatedId, eliminatedName, eliminatorId, eliminatorName, rank, level, isLeaderKill }` | Joueur éliminé |
| `elimination:tournament_complete` | `{ tournamentId, winnerId, winnerName }` | Tournoi terminé |

### Leaderboard Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `leaderboard:updated` | `{ tournamentId, timestamp }` | Classement mis à jour |

### Tournament Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `tournament:status_change` | `{ tournamentId, status, timestamp }` | Statut du tournoi changé |
| `tournament:player_enrolled` | `{ tournamentId, playerId, playerName }` | Joueur inscrit |
| `tournament:player_withdrawn` | `{ tournamentId, playerId }` | Joueur retiré |

### Table Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `tables:generated` | `{ tournamentId, tablesCount, totalPlayers }` | Tables générées |
| `tables:rebalanced` | `{ tournamentId, tablesCount }` | Tables rééquilibrées |
| `table:player_moved` | `{ tournamentId, playerId, newTable, newSeat }` | Joueur déplacé |

### Rebuy Events

| Événement | Données | Description |
|-----------|---------|-------------|
| `rebuy:recorded` | `{ tournamentId, playerId, playerName, rebuyType }` | Recave enregistrée |

## 💻 Utilisation Côté Client

### 1. Hook Simple - Écouter les Mises à Jour

\`\`\`tsx
import { useRealtimeTournament } from '@/hooks/useRealtimeTournament';

function TournamentPage({ tournamentId }: { tournamentId: string }) {
  const { lastUpdate } = useRealtimeTournament(tournamentId);

  // Le composant se rafraîchira automatiquement à chaque événement
  useEffect(() => {
    console.log('Tournament updated at:', lastUpdate);
    // Recharger les données...
  }, [lastUpdate]);

  return <div>Tournament {tournamentId}</div>;
}
\`\`\`

### 2. Hook Personnalisé - Événement Spécifique

\`\`\`tsx
import { useTournamentEvent } from '@/contexts/SocketContext';

function LiveLeaderboard({ tournamentId }: { tournamentId: string }) {
  const [players, setPlayers] = useState([]);

  // Écouter les éliminations
  useTournamentEvent(tournamentId, 'elimination:player_out', (data) => {
    console.log(\`\${data.eliminatedName} eliminated by \${data.eliminatorName}\`);

    if (data.isLeaderKill) {
      // Afficher une notification spéciale pour leader kill
      toast.success(\`🔥 Leader Kill! \${data.eliminatorName}\`);
    }

    // Recharger le leaderboard
    fetchLeaderboard();
  });

  // Écouter la fin du tournoi
  useTournamentEvent(tournamentId, 'elimination:tournament_complete', (data) => {
    toast.success(\`🏆 Winner: \${data.winnerName}!\`);
    router.push(\`/tournaments/\${tournamentId}/results\`);
  });

  return <div>Leaderboard...</div>;
}
\`\`\`

### 3. Accès Direct au Socket

\`\`\`tsx
import { useSocket } from '@/contexts/SocketContext';

function AdvancedComponent() {
  const { socket, isConnected, joinTournament, leaveTournament } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Rejoindre manuellement une room
    joinTournament('tournament-id');

    // Écouter un événement custom
    socket.on('custom-event', (data) => {
      console.log('Custom event received:', data);
    });

    return () => {
      socket.off('custom-event');
      leaveTournament('tournament-id');
    };
  }, [socket, isConnected]);

  return (
    <div>
      Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}
    </div>
  );
}
\`\`\`

## 🛠️ Utilisation Côté Serveur (API Routes)

### Émettre un Événement

\`\`\`typescript
import { emitToTournament } from '@/lib/socket';

export async function POST(req: Request) {
  // ... votre logique ...

  // Émettre un événement à tous les clients du tournoi
  emitToTournament(tournamentId, 'timer:started', {
    tournamentId,
    startedAt: new Date(),
    currentLevel: 1,
  });

  return NextResponse.json({ success: true });
}
\`\`\`

### Exemples Déjà Implémentés

Les API routes suivantes émettent déjà des événements WebSocket :

- ✅ `/api/tournaments/[id]/timer/start` → `timer:started`
- ✅ `/api/tournaments/[id]/timer/pause` → `timer:paused`
- ✅ `/api/tournaments/[id]/timer/resume` → `timer:resumed`
- ✅ `/api/tournaments/[id]/eliminations` → `elimination:player_out`, `leaderboard:updated`

## 📱 Cas d'Usage Recommandés

### Vue TV (Écran Public)

\`\`\`tsx
function TVDisplay({ tournamentId }: { tournamentId: string }) {
  const [tournament, setTournament] = useState(null);

  // Écouter tous les événements importants
  useTournamentEvent(tournamentId, 'timer:level_change', async (data) => {
    // Mettre à jour l'affichage des blinds instantanément
    await fetchTournamentData();
  });

  useTournamentEvent(tournamentId, 'elimination:player_out', (data) => {
    // Afficher une animation d'élimination
    showEliminationAnimation(data);
  });

  return <div>TV Display...</div>;
}
\`\`\`

### Vue Mobile Joueur

\`\`\`tsx
function PlayerView({ tournamentId, playerId }: Props) {
  useTournamentEvent(tournamentId, 'leaderboard:updated', () => {
    // Rafraîchir le classement automatiquement
    fetchLeaderboard();
  });

  useTournamentEvent(tournamentId, 'table:player_moved', (data) => {
    if (data.playerId === playerId) {
      toast.info(\`Table changée: Table \${data.newTable}, Siège \${data.newSeat}\`);
    }
  });

  return <div>Player View...</div>;
}
\`\`\`

### Timer Synchronisé

\`\`\`tsx
function TournamentTimer({ tournamentId }: { tournamentId: string }) {
  const [isPaused, setIsPaused] = useState(false);

  useTournamentEvent(tournamentId, 'timer:paused', () => {
    setIsPaused(true);
  });

  useTournamentEvent(tournamentId, 'timer:resumed', () => {
    setIsPaused(false);
  });

  return (
    <div>
      {isPaused ? '⏸️ PAUSE' : '▶️ RUNNING'}
    </div>
  );
}
\`\`\`

## 🔍 Debugging

### Logs Console

Les événements WebSocket sont loggés dans la console :

- **Client** : Messages préfixés par `✅`, `❌`, `📺`
- **Serveur** : Messages préfixés par `🔔`

### Vérifier la Connexion

\`\`\`tsx
import { useSocket } from '@/contexts/SocketContext';

function DebugPanel() {
  const { socket, isConnected } = useSocket();

  return (
    <div>
      <p>Socket ID: {socket?.id || 'N/A'}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Transport: {socket?.io?.engine?.transport?.name || 'N/A'}</p>
    </div>
  );
}
\`\`\`

## ⚠️ Notes Importantes

1. **Reconnexion Automatique** : Le client se reconnecte automatiquement en cas de déconnexion
2. **Rooms Persistence** : Les rooms sont automatiquement rejointes après reconnexion
3. **Fallback Polling** : Si vous préférez le polling, vous pouvez toujours utiliser les API REST
4. **Production** : En production, configurez CORS et SSL dans `server.js`

## 🚨 Troubleshooting

### Le client ne se connecte pas

1. Vérifiez que le serveur WebSocket est démarré (`npm run dev`)
2. Vérifiez la console pour les erreurs
3. Vérifiez que le port 3003 n'est pas bloqué

### Les événements ne sont pas reçus

1. Vérifiez que vous avez rejoint la room du tournoi
2. Vérifiez que l'événement est bien émis côté serveur (logs `🔔`)
3. Vérifiez l'orthographe du nom de l'événement

### Événements en double

Si vous recevez des événements en double, c'est probablement dû à :
- Plusieurs composants écoutant le même événement
- Cleanup non effectué dans useEffect

Solution :
\`\`\`tsx
useEffect(() => {
  const handler = (data) => { /* ... */ };
  socket.on('event', handler);

  return () => {
    socket.off('event', handler); // Important!
  };
}, [socket]);
\`\`\`

## 📚 Références

- [Socket.IO Documentation](https://socket.io/docs/)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)
