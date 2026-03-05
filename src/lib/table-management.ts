import { prisma } from '@/lib/prisma';

// ============================================
// Types
// ============================================

type PlayerAssignment = {
  id: string;
  playerId: string;
  playerName: string;
  seatNumber: number | null;
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
// REASSIGN (redistribution complète fin de niveau)
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
  // On ne réduit jamais le nombre de tables ici — la fusion est manuelle via /tables/merge
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
