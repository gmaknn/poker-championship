import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';

// ============================================
// Types
// ============================================

type PlayerAssignment = {
  id: string;
  playerId: string;
  playerName: string;
  seatNumber: number | null;
};

export type BreakResult = {
  broken: true;
  brokenTable: number;
  movements: Array<{
    playerId: string;
    playerName: string;
    toTable: number;
    toSeat: number;
  }>;
} | {
  broken: false;
};

export type BalanceMove = {
  playerId: string;
  playerName: string;
  fromTable: number;
  toTable: number;
  seatNumber: number;
};

export type ReassignResult = {
  totalMoves: number;
  movedPlayerIds: string[];
  tablesCount: number;
};

// ============================================
// Utilitaire partagé
// ============================================

/**
 * Retourne les joueurs actifs groupés par table.
 */
async function getActivePlayersByTable(
  tournamentId: string
): Promise<Map<number, PlayerAssignment[]>> {
  const assignments = await prisma.tableAssignment.findMany({
    where: { tournamentId, isActive: true },
  });

  // Charger les noms des joueurs
  const players = await prisma.player.findMany({
    where: { tournamentPlayers: { some: { tournamentId } } },
    select: { id: true, firstName: true, lastName: true, nickname: true },
  });
  const nameMap = new Map(
    players.map((p) => [p.id, p.nickname || `${p.firstName} ${p.lastName}`])
  );

  const tableMap = new Map<number, PlayerAssignment[]>();
  for (const a of assignments) {
    const list = tableMap.get(a.tableNumber) || [];
    list.push({
      id: a.id,
      playerId: a.playerId,
      playerName: nameMap.get(a.playerId) || 'Joueur',
      seatNumber: a.seatNumber,
    });
    tableMap.set(a.tableNumber, list);
  }

  return tableMap;
}

// ============================================
// Mécanisme 1 — BREAKING (casse de table)
// ============================================

/**
 * Vérifie si une table peut être cassée et la casse si oui.
 * Condition UNIQUE : la table la moins remplie a STRICTEMENT MOINS de tableBreakThreshold joueurs
 * ET les joueurs restants tiennent physiquement dans N-1 tables.
 * La table la MOINS remplie est cassée, ses joueurs sont redistribués
 * en round-robin sur les sièges libres des tables restantes.
 */
export async function breakTable(tournamentId: string): Promise<BreakResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seatsPerTable: true, tableBreakThreshold: true },
  });
  const seatsPerTable = tournament?.seatsPerTable ?? 9;
  const tableBreakThreshold = tournament?.tableBreakThreshold ?? 3;

  const tableMap = await getActivePlayersByTable(tournamentId);
  const tableNumbers = Array.from(tableMap.keys()).sort((a, b) => a - b);

  if (tableNumbers.length <= 1) {
    console.log(`🔨 [breakTable] Only ${tableNumbers.length} table(s), nothing to break`);
    return { broken: false };
  }

  const totalPlayers = Array.from(tableMap.values()).reduce((sum, p) => sum + p.length, 0);

  // Log de diagnostic pour chaque table
  for (const tableNum of tableNumbers) {
    const count = tableMap.get(tableNum)!.length;
    console.log(`🔨 [breakTable] Table ${tableNum}: ${count} players, threshold=${tableBreakThreshold}, under threshold: ${count < tableBreakThreshold}`);
  }

  // Trouver la table la moins remplie (première par numéro en cas d'égalité)
  let minTable = tableNumbers[0];
  let minCount = tableMap.get(minTable)!.length;
  for (const tableNum of tableNumbers) {
    const count = tableMap.get(tableNum)!.length;
    if (count < minCount) {
      minCount = count;
      minTable = tableNum;
    }
  }

  // Condition UNIQUE : la table la moins remplie doit être STRICTEMENT sous le seuil
  if (minCount >= tableBreakThreshold) {
    console.log(
      `🔨 [breakTable] Table ${minTable} has ${minCount} players, ` +
      `threshold is ${tableBreakThreshold} — no break needed`
    );
    return { broken: false };
  }

  // Vérification de sécurité : les joueurs doivent tenir dans N-1 tables
  const maxCapacityWithOneLess = seatsPerTable * (tableNumbers.length - 1);
  if (totalPlayers > maxCapacityWithOneLess) {
    console.log(
      `🔨 [breakTable] Table ${minTable} is under threshold (${minCount} < ${tableBreakThreshold}) ` +
      `but players (${totalPlayers}) won't fit in ${tableNumbers.length - 1} tables (capacity ${maxCapacityWithOneLess}) — no break`
    );
    return { broken: false };
  }

  console.log(
    `🔨 [breakTable] ${totalPlayers} players, ${tableNumbers.length} tables, ` +
    `Table ${minTable} has ${minCount} players (< threshold ${tableBreakThreshold}) — BREAKING`
  );

  const playersToMove = tableMap.get(minTable)!;
  const remainingTables = tableNumbers.filter((t) => t !== minTable);

  console.log(
    `🔨 [breakTable] Breaking Table ${minTable} (${minCount} players) → ` +
    `redistributing to tables [${remainingTables.join(', ')}]`
  );

  // Build free seats per table
  const freeSeatsByTable = new Map<number, number[]>();
  const playerCountByTable = new Map<number, number>();
  for (const tableNum of remainingTables) {
    const players = tableMap.get(tableNum)!;
    playerCountByTable.set(tableNum, players.length);
    const occupied = new Set(
      players.map((p) => p.seatNumber).filter((s): s is number => s !== null)
    );
    const free: number[] = [];
    for (let s = 1; s <= seatsPerTable; s++) {
      if (!occupied.has(s)) {
        free.push(s);
      }
    }
    freeSeatsByTable.set(tableNum, free);
  }

  const movements: Array<{
    playerId: string;
    playerName: string;
    toTable: number;
    toSeat: number;
  }> = [];

  // Mélanger les joueurs à déplacer
  const shuffledPlayers = [...playersToMove];
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
  }

  // Round-robin : attribuer chaque joueur à la table la MOINS remplie
  for (const player of shuffledPlayers) {
    // Trouver la table avec le moins de joueurs (première par numéro en cas d'égalité)
    let bestTable = remainingTables[0];
    let bestCount = playerCountByTable.get(bestTable) ?? Infinity;
    for (const tableNum of remainingTables) {
      const count = playerCountByTable.get(tableNum) ?? Infinity;
      if (count < bestCount) {
        bestCount = count;
        bestTable = tableNum;
      }
    }

    const freeSeats = freeSeatsByTable.get(bestTable) || [];
    if (freeSeats.length === 0) {
      console.error(`🔨 [breakTable] No free seat on table ${bestTable} — aborting`);
      return { broken: false };
    }

    const seatNumber = freeSeats.shift()!;
    playerCountByTable.set(bestTable, (playerCountByTable.get(bestTable) ?? 0) + 1);

    movements.push({
      playerId: player.playerId,
      playerName: player.playerName,
      toTable: bestTable,
      toSeat: seatNumber,
    });

    console.log(
      `🔨 [breakTable] ${player.playerName}: Table ${minTable} → Table ${bestTable} Seat ${seatNumber}`
    );
  }

  // Transaction atomique : désactiver les assignations de la table cassée + créer les nouvelles
  await prisma.$transaction(async (tx) => {
    for (const player of playersToMove) {
      await tx.tableAssignment.update({
        where: { id: player.id },
        data: { isActive: false },
      });
    }

    for (const movement of movements) {
      await tx.tableAssignment.create({
        data: {
          tournamentId,
          playerId: movement.playerId,
          tableNumber: movement.toTable,
          seatNumber: movement.toSeat,
          isActive: true,
        },
      });
    }
  });

  // Émettre l'événement Socket.IO
  emitToTournament(tournamentId, 'tables:broken', {
    tournamentId,
    brokenTable: minTable,
    remainingTables: remainingTables.length,
    movements,
  });

  console.log(`🔨 [breakTable] ✅ Table ${minTable} broken, ${movements.length} players redistributed`);

  return { broken: true, brokenTable: minTable, movements };
}

// ============================================
// Mécanisme 2 — BALANCING (équilibrage post-élimination)
// ============================================

/**
 * Équilibre les tables après une élimination.
 * Déplace les joueurs un par un de la table la plus remplie vers la moins remplie.
 * Utilise la règle du même siège / siège le plus proche.
 * S'arrête quand l'écart est < 2.
 */
export async function balanceTables(
  tournamentId: string,
  eliminatedSeat: number | null,
  eliminatedTable: number
): Promise<BalanceMove[]> {
  const moves: BalanceMove[] = [];
  let targetTableNumber = eliminatedTable;
  let targetSeatNumber = eliminatedSeat;
  let iteration = 0;
  const MAX_ITERATIONS = 20;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const tableMap = await getActivePlayersByTable(tournamentId);

    // Inclure la table cible même si elle est vide
    if (!tableMap.has(targetTableNumber)) {
      tableMap.set(targetTableNumber, []);
    }

    const tableNumbers = Array.from(tableMap.keys()).sort((a, b) => a - b);

    // Trouver min et max
    let maxTable = -1;
    let maxCount = 0;
    let minCount = Infinity;

    for (const tableNum of tableNumbers) {
      const count = tableMap.get(tableNum)!.length;
      if (count > maxCount) {
        maxCount = count;
        maxTable = tableNum;
      }
      if (count < minCount) {
        minCount = count;
      }
    }

    const gap = maxCount - minCount;
    console.log(
      `⚖️ [balanceTables] Iteration ${iteration} — Max: Table ${maxTable} (${maxCount}), Min: ${minCount}, Gap: ${gap}`
    );

    if (gap < 2) {
      console.log(`⚖️ [balanceTables] Tables balanced (gap < 2), stopping`);
      break;
    }

    // Table source = la plus remplie
    const sourceAssignments = tableMap.get(maxTable)!;

    // Trouver le joueur au même siège que l'éliminé, sinon le plus proche
    const targetSeat = targetSeatNumber ?? 1;
    let bestAssignment = sourceAssignments[0];
    let bestDistance = Infinity;

    for (const a of sourceAssignments) {
      const seat = a.seatNumber ?? 1;
      const distance = Math.abs(seat - targetSeat);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAssignment = a;
      }
    }

    if (!bestAssignment) {
      console.log(`⚖️ [balanceTables] No player found at source table — stopping`);
      break;
    }

    console.log(
      `⚖️ [balanceTables] Moving ${bestAssignment.playerName} from Table ${maxTable} Seat ${bestAssignment.seatNumber} → Table ${targetTableNumber} Seat ${targetSeatNumber}`
    );

    // Transaction atomique
    await prisma.$transaction(async (tx) => {
      await tx.tableAssignment.update({
        where: { id: bestAssignment.id },
        data: { isActive: false },
      });
      await tx.tableAssignment.create({
        data: {
          tournamentId,
          playerId: bestAssignment.playerId,
          tableNumber: targetTableNumber,
          seatNumber: targetSeatNumber,
          isActive: true,
        },
      });
    });

    const move: BalanceMove = {
      playerId: bestAssignment.playerId,
      playerName: bestAssignment.playerName,
      fromTable: maxTable,
      toTable: targetTableNumber,
      seatNumber: targetSeatNumber ?? 0,
    };
    moves.push(move);

    // Émettre l'événement Socket.IO
    emitToTournament(tournamentId, 'table:player_moved', {
      tournamentId,
      playerId: bestAssignment.playerId,
      playerName: bestAssignment.playerName,
      fromTable: maxTable,
      toTable: targetTableNumber,
      seatNumber: targetSeatNumber ?? 0,
    });

    console.log(`⚖️ [balanceTables] ✅ ${bestAssignment.playerName} moved successfully`);

    // Pour la prochaine itération : le trou est le siège libéré à la table source
    targetTableNumber = maxTable;
    targetSeatNumber = bestAssignment.seatNumber;
  }

  if (moves.length > 0) {
    console.log(`⚖️ [balanceTables] ✅ ${moves.length} move(s) completed`);
  }

  return moves;
}

// ============================================
// Mécanisme 3 — REASSIGN (redistribution complète fin de niveau)
// ============================================

/**
 * Redistribution COMPLÈTE de tous les joueurs actifs sur les tables EXISTANTES.
 * Shuffle aléatoire des joueurs, répartition séquentielle sur les sièges.
 * Ne casse ni ne crée de table.
 */
export async function reassignAllPlayers(tournamentId: string): Promise<ReassignResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seatsPerTable: true },
  });
  const seatsPerTable = tournament?.seatsPerTable ?? 9;

  // Récupérer les tables existantes et les joueurs actifs
  const activeAssignments = await prisma.tableAssignment.findMany({
    where: { tournamentId, isActive: true },
  });

  if (activeAssignments.length === 0) {
    console.log(`🔀 [reassignAllPlayers] No active assignments — skipping`);
    return { totalMoves: 0, movedPlayerIds: [], tablesCount: 0 };
  }

  // Tables existantes : TOUTES les tables du tournoi (y compris celles vidées par auto-élimination)
  // On ne doit JAMAIS réduire le nombre de tables — la casse est le job de breakTable()
  const allAssignments = await prisma.tableAssignment.findMany({
    where: { tournamentId },
    select: { tableNumber: true, isActive: true },
  });
  const allTables = new Set(allAssignments.map((a) => a.tableNumber));
  // Utiliser toutes les tables connues, pas seulement celles avec joueurs actifs
  // (une table vide après auto-élim reste une table valide pour la redistribution)
  const tableNumbers = Array.from(allTables).sort((a, b) => a - b);

  // Vérifier que les joueurs tiennent dans les tables (sécurité)
  const totalCapacity = tableNumbers.length * seatsPerTable;
  if (activeAssignments.length > totalCapacity) {
    console.error(`🔀 [reassignAllPlayers] ${activeAssignments.length} players > ${totalCapacity} capacity — aborting`);
    return { totalMoves: 0, movedPlayerIds: [], tablesCount: tableNumbers.length };
  }

  // Charger les noms
  const players = await prisma.player.findMany({
    where: { tournamentPlayers: { some: { tournamentId } } },
    select: { id: true, firstName: true, lastName: true, nickname: true },
  });
  const nameMap = new Map(
    players.map((p) => [p.id, p.nickname || `${p.firstName} ${p.lastName}`])
  );

  // Ancienne assignation par joueur (pour calculer les movedPlayerIds)
  const oldTableMap = new Map(
    activeAssignments.map((a) => [a.playerId, a.tableNumber])
  );

  // Shuffle des joueurs
  const playerIds = activeAssignments.map((a) => a.playerId);
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }

  // Répartir les joueurs séquentiellement sur les tables existantes
  const newAssignments: Array<{
    tournamentId: string;
    playerId: string;
    tableNumber: number;
    seatNumber: number;
    isActive: boolean;
  }> = [];

  let playerIndex = 0;
  const totalPlayers = playerIds.length;

  for (let t = 0; t < tableNumbers.length; t++) {
    const tableNumber = tableNumbers[t];
    const playersForThisTable = Math.ceil(
      (totalPlayers - playerIndex) / (tableNumbers.length - t)
    );

    for (let s = 1; s <= playersForThisTable && playerIndex < totalPlayers; s++) {
      newAssignments.push({
        tournamentId,
        playerId: playerIds[playerIndex],
        tableNumber,
        seatNumber: s,
        isActive: true,
      });
      playerIndex++;
    }
  }

  // Identifier les joueurs déplacés
  const movedPlayerIds = newAssignments
    .filter((a) => oldTableMap.get(a.playerId) !== a.tableNumber)
    .map((a) => a.playerId);

  console.log(
    `🔀 [reassignAllPlayers] ${totalPlayers} players shuffled across ${tableNumbers.length} tables, ` +
    `${movedPlayerIds.length} moved`
  );

  // Transaction atomique
  await prisma.$transaction(async (tx) => {
    await tx.tableAssignment.updateMany({
      where: { tournamentId },
      data: { isActive: false },
    });

    if (newAssignments.length > 0) {
      await tx.tableAssignment.createMany({
        data: newAssignments,
      });
    }
  });

  // Log des mouvements
  for (const a of newAssignments) {
    const oldTable = oldTableMap.get(a.playerId);
    if (oldTable !== a.tableNumber) {
      const name = nameMap.get(a.playerId) || 'Joueur';
      console.log(
        `🔀 [reassignAllPlayers] ${name}: Table ${oldTable} → Table ${a.tableNumber} Seat ${a.seatNumber}`
      );
    }
  }

  console.log(`🔀 [reassignAllPlayers] ✅ Reassignment completed`);

  return {
    totalMoves: movedPlayerIds.length,
    movedPlayerIds,
    tablesCount: tableNumbers.length,
  };
}
