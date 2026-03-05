import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isAdminMultiRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/purge-test-tournaments
 * Retourne le nombre de tournois test générés (pour le badge)
 */
export async function GET(request: NextRequest) {
  try {
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isAdmin = isAdminMultiRole(currentPlayer.role, currentPlayer.additionalRoles);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const count = await prisma.tournament.count({
      where: { isTestGenerated: true },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting test tournaments:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/purge-test-tournaments
 * Supprime tous les tournois avec isTestGenerated === true
 * NE touche PAS aux tournois isTestTemplate ni aux tournois normaux
 * Sécurité : Admin uniquement
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const isAdmin = isAdminMultiRole(currentPlayer.role, currentPlayer.additionalRoles);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accès refusé - Admin requis' },
        { status: 403 }
      );
    }

    // Trouver tous les tournois test générés (pas les templates)
    const testTournaments = await prisma.tournament.findMany({
      where: {
        isTestGenerated: true,
      },
      select: { id: true, name: true },
    });

    if (testTournaments.length === 0) {
      return NextResponse.json({
        deleted: 0,
        message: 'Aucun tournoi de test trouvé',
      });
    }

    const tournamentIds = testTournaments.map((t) => t.id);

    // Supprimer dans une transaction (ordre FK : enfants d'abord)
    const deletedCounts = await prisma.$transaction(async (tx) => {
      const eliminations = await tx.elimination.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const bustEvents = await tx.bustEvent.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const tournamentPlayers = await tx.tournamentPlayer.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const blindLevels = await tx.blindLevel.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const tables = await tx.tableAssignment.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const chipConfigs = await tx.tournamentChipConfig.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const chipDenominations = await tx.chipDenomination.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const directors = await tx.tournamentDirector.deleteMany({
        where: { tournamentId: { in: tournamentIds } },
      });

      const tournaments = await tx.tournament.deleteMany({
        where: { id: { in: tournamentIds } },
      });

      return {
        tournaments: tournaments.count,
        eliminations: eliminations.count,
        bustEvents: bustEvents.count,
        tournamentPlayers: tournamentPlayers.count,
        blindLevels: blindLevels.count,
        tableAssignments: tables.count,
        chipConfigs: chipConfigs.count,
        chipDenominations: chipDenominations.count,
        directors: directors.count,
      };
    });

    return NextResponse.json({
      deleted: deletedCounts.tournaments,
      tournamentNames: testTournaments.map((t) => t.name),
      deletedCounts,
    });
  } catch (error) {
    console.error('Error purging test tournaments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la purge des tournois de test' },
      { status: 500 }
    );
  }
}
