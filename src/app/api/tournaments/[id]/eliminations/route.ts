import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const eliminationSchema = z.object({
  eliminatedId: z.string().cuid(),
  eliminatorId: z.string().cuid(),
});

// GET - Récupérer toutes les éliminations du tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eliminations = await prisma.elimination.findMany({
      where: { tournamentId: id },
      include: {
        eliminated: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
        eliminator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(eliminations);
  } catch (error) {
    console.error('Error fetching eliminations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eliminations' },
      { status: 500 }
    );
  }
}

// POST - Enregistrer une nouvelle élimination
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const validatedData = eliminationSchema.parse(body);

    // Vérifier que le tournoi existe et est en cours
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Tournament is not in progress' },
        { status: 400 }
      );
    }

    // Vérifier que les deux joueurs sont inscrits au tournoi
    const eliminatedPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.eliminatedId
    );
    const eliminatorPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.eliminatorId
    );

    if (!eliminatedPlayer || !eliminatorPlayer) {
      return NextResponse.json(
        { error: 'One or both players are not enrolled in this tournament' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur éliminé n'a pas déjà une position finale
    if (eliminatedPlayer.finalRank !== null) {
      return NextResponse.json(
        { error: 'Player has already been eliminated' },
        { status: 400 }
      );
    }

    // Compter le nombre de joueurs restants pour déterminer le rank
    const remainingPlayers = tournament.tournamentPlayers.filter(
      (tp) => tp.finalRank === null
    ).length;
    const rank = remainingPlayers; // Position de sortie

    // Récupérer toutes les éliminations existantes pour déterminer le leader killer
    const existingEliminations = await prisma.elimination.findMany({
      where: { tournamentId },
      include: {
        tournament: {
          include: {
            tournamentPlayers: true,
          },
        },
      },
    });

    // Compter les éliminations par joueur
    const eliminationCounts = new Map<string, number>();
    existingEliminations.forEach((elim) => {
      const count = eliminationCounts.get(elim.eliminatorId) || 0;
      eliminationCounts.set(elim.eliminatorId, count + 1);
    });

    // Ajouter l'élimination actuelle au décompte
    const currentEliminatorCount =
      (eliminationCounts.get(validatedData.eliminatorId) || 0) + 1;
    eliminationCounts.set(validatedData.eliminatorId, currentEliminatorCount);

    // Trouver le maximum d'éliminations
    const maxEliminations = Math.max(...Array.from(eliminationCounts.values()));

    // Vérifier si c'est un leader kill (l'éliminateur a maintenant le plus d'éliminations)
    const isLeaderKill = currentEliminatorCount === maxEliminations;

    // Créer l'élimination dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'élimination
      const elimination = await tx.elimination.create({
        data: {
          tournamentId,
          eliminatedId: validatedData.eliminatedId,
          eliminatorId: validatedData.eliminatorId,
          rank,
          level: tournament.currentLevel,
          isLeaderKill,
        },
        include: {
          eliminated: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
          eliminator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      });

      // Mettre à jour le joueur éliminé
      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: validatedData.eliminatedId,
          },
        },
        data: {
          finalRank: rank,
        },
      });

      // Mettre à jour l'éliminateur (incrémenter ses éliminations)
      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: validatedData.eliminatorId,
          },
        },
        data: {
          eliminationsCount: { increment: 1 },
          leaderKills: isLeaderKill ? { increment: 1 } : undefined,
        },
      });

      return elimination;
    });

    // Vérifier s'il ne reste qu'un joueur actif (fin du tournoi)
    const activePlayersCount = await prisma.tournamentPlayer.count({
      where: {
        tournamentId,
        finalRank: null,
      },
    });

    let tournamentCompleted = false;
    if (activePlayersCount === 1) {
      // Il ne reste qu'un joueur, c'est le gagnant
      const winner = await prisma.tournamentPlayer.findFirst({
        where: {
          tournamentId,
          finalRank: null,
        },
      });

      if (winner) {
        // Marquer le gagnant avec le rang 1
        await prisma.tournamentPlayer.update({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId: winner.playerId,
            },
          },
          data: {
            finalRank: 1,
          },
        });

        // Marquer le tournoi comme terminé
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'FINISHED',
            finishedAt: new Date(),
          },
        });

        tournamentCompleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      elimination: result,
      tournamentCompleted,
      remainingPlayers: activePlayersCount,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating elimination:', error);
    return NextResponse.json(
      { error: 'Failed to create elimination' },
      { status: 500 }
    );
  }
}
