import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';

export type RebalanceMove = {
  playerId: string;
  playerName: string;
  fromTable: number;
  toTable: number;
  seatNumber: number;
};

/**
 * Rééquilibrage intelligent des tables entre tables existantes.
 * Déplace les joueurs un par un de la table la plus remplie vers la moins remplie.
 * Utilise la règle du même siège / siège le plus proche.
 * S'arrête quand l'écart entre les tables est < 2.
 *
 * @param tournamentId - ID du tournoi
 * @param options.maxIterations - Sécurité anti-boucle infinie (défaut: 20)
 * @param options.emitSocketEvents - Émettre des events Socket.IO pour chaque déplacement (défaut: true)
 * @returns Liste des déplacements effectués
 */
export async function rebalanceTablesBetweenExisting(
  tournamentId: string,
  options: {
    maxIterations?: number;
    emitSocketEvents?: boolean;
  } = {}
): Promise<RebalanceMove[]> {
  const { maxIterations = 20, emitSocketEvents = true } = options;

  // Charger les noms des joueurs
  const players = await prisma.player.findMany({
    where: { tournamentPlayers: { some: { tournamentId } } },
    select: { id: true, firstName: true, lastName: true, nickname: true },
  });
  const playerNameMap = new Map(
    players.map((p) => [p.id, p.nickname || `${p.firstName} ${p.lastName}`])
  );

  const moves: RebalanceMove[] = [];

  let iteration = 0;
  while (iteration < maxIterations) {
    iteration++;

    const activeAssignments = await prisma.tableAssignment.findMany({
      where: { tournamentId, isActive: true },
    });

    if (activeAssignments.length === 0) break;

    // Grouper par table
    const tableCountMap = new Map<number, typeof activeAssignments>();
    for (const a of activeAssignments) {
      const existing = tableCountMap.get(a.tableNumber) || [];
      existing.push(a);
      tableCountMap.set(a.tableNumber, existing);
    }

    // Trouver min et max (premier par numéro en cas d'égalité)
    const sortedTableNumbers = Array.from(tableCountMap.keys()).sort((a, b) => a - b);
    let maxTable = -1;
    let maxCount = 0;
    let minTable = -1;
    let minCount = Infinity;

    for (const tableNum of sortedTableNumbers) {
      const count = tableCountMap.get(tableNum)!.length;
      if (count > maxCount) {
        maxCount = count;
        maxTable = tableNum;
      }
      if (count < minCount) {
        minCount = count;
        minTable = tableNum;
      }
    }

    const gap = maxCount - minCount;
    console.log(
      `🔄 [rebalance] Iteration ${iteration} — Max: Table ${maxTable} (${maxCount}), Min: Table ${minTable} (${minCount}), Gap: ${gap}`
    );

    if (gap < 2) break;

    // Table source = la plus remplie, table cible = la moins remplie
    const sourceAssignments = tableCountMap.get(maxTable)!;
    const targetAssignments = tableCountMap.get(minTable)!;

    // Trouver un siège cible : le premier siège libre (1..9)
    const occupiedSeats = new Set(targetAssignments.map((a) => a.seatNumber));
    let targetSeatNumber: number | null = null;
    for (let s = 1; s <= 9; s++) {
      if (!occupiedSeats.has(s)) {
        targetSeatNumber = s;
        break;
      }
    }
    if (targetSeatNumber === null) targetSeatNumber = minCount + 1;

    // Trouver le joueur au siège le plus proche du targetSeat dans la source
    let bestAssignment = sourceAssignments[0];
    let bestDistance = Infinity;

    for (const a of sourceAssignments) {
      const seat = a.seatNumber ?? 1;
      const distance = Math.abs(seat - targetSeatNumber);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAssignment = a;
      }
    }

    if (!bestAssignment) break;

    const playerName = playerNameMap.get(bestAssignment.playerId) || 'Joueur';
    console.log(
      `🔄 [rebalance] Moving ${playerName} from Table ${maxTable} Seat ${bestAssignment.seatNumber} → Table ${minTable} Seat ${targetSeatNumber}`
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
          tableNumber: minTable,
          seatNumber: targetSeatNumber,
          isActive: true,
        },
      });
    });

    const move: RebalanceMove = {
      playerId: bestAssignment.playerId,
      playerName,
      fromTable: maxTable,
      toTable: minTable,
      seatNumber: targetSeatNumber,
    };

    moves.push(move);

    // Émettre l'événement Socket.IO pour chaque déplacement
    if (emitSocketEvents) {
      emitToTournament(tournamentId, 'table:player_moved', {
        tournamentId,
        playerId: bestAssignment.playerId,
        playerName,
        fromTable: maxTable,
        toTable: minTable,
        seatNumber: targetSeatNumber,
      });
    }
  }

  if (moves.length > 0) {
    console.log(`🔄 [rebalance] ✅ ${moves.length} move(s) completed for tournament ${tournamentId}`);
  }

  return moves;
}
