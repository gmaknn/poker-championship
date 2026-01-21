import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isAdminMultiRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/admin/delete-tournament/[id]
 * Route temporaire pour supprimer un tournoi de test
 * Sécurité : Admin uniquement + nom doit contenir "TEST"
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Vérifier l'authentification admin
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier permission admin
    const isAdmin = isAdminMultiRole(currentPlayer.role, currentPlayer.additionalRoles);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accès refusé - Admin requis' },
        { status: 403 }
      );
    }

    // Note: id déjà extrait en haut de la fonction

    // 2. Récupérer le tournoi et vérifier qu'il contient "TEST"
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    if (!tournament.name || !tournament.name.toUpperCase().includes('TEST')) {
      return NextResponse.json(
        { error: 'Sécurité : seuls les tournois avec "TEST" dans le nom peuvent être supprimés via cette route' },
        { status: 400 }
      );
    }

    // 3. Supprimer dans une transaction
    const deletedCounts = await prisma.$transaction(async (tx) => {
      // Supprimer les Eliminations
      const eliminations = await tx.elimination.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer les BustEvents
      const bustEvents = await tx.bustEvent.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer les TournamentPlayers
      const tournamentPlayers = await tx.tournamentPlayer.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer les BlindLevels
      const blindLevels = await tx.blindLevel.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer les TableAssignments (seats inclus dans le même modèle)
      const tables = await tx.tableAssignment.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer les TournamentDirectors
      const directors = await tx.tournamentDirector.deleteMany({
        where: { tournamentId: id },
      });

      // Supprimer le Tournament lui-même
      await tx.tournament.delete({
        where: { id },
      });

      return {
        eliminations: eliminations.count,
        bustEvents: bustEvents.count,
        tournamentPlayers: tournamentPlayers.count,
        blindLevels: blindLevels.count,
        tableAssignments: tables.count,
        directors: directors.count,
      };
    });

    return NextResponse.json({
      deleted: true,
      tournamentId: id,
      tournamentName: tournament.name,
      deletedCounts,
    });
  } catch (error) {
    console.error('Error deleting test tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du tournoi' },
      { status: 500 }
    );
  }
}
