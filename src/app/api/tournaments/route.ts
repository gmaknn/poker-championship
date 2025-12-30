import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentPlayer, getCurrentActor } from '@/lib/auth-helpers';
import { canViewAllTournaments, canCreateTournament } from '@/lib/permissions';

// Validation schema for tournament creation
const tournamentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  seasonId: z.string().min(1, 'La saison est requise'),
  date: z.string().datetime(),
  buyInAmount: z.number().min(0).default(10),
  startingChips: z.number().int().min(1000).default(5000),
  targetDuration: z.number().int().min(30).default(180),
  totalPlayers: z.number().int().min(2).optional(),
  status: z.enum(['PLANNED', 'REGISTRATION', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).default('PLANNED'),
  createdById: z.string().optional(), // ID du joueur créateur (Tournament Director ou Admin)
});

// GET all tournaments
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'utilisateur actuel (optionnel pour GET)
    const currentPlayer = await getCurrentPlayer(request);

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const createdById = searchParams.get('createdById'); // Filter by creator

    const where: any = {};
    if (seasonId) where.seasonId = seasonId;
    if (createdById) where.createdById = createdById;

    // Appliquer le filtrage selon les permissions seulement si authentifié
    if (currentPlayer && !canViewAllTournaments(currentPlayer.role)) {
      // Si l'utilisateur ne peut pas voir tous les tournois,
      // filtrer pour ne montrer que ses propres tournois
      where.createdById = currentPlayer.id;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
        tournamentPlayers: {
          where: {
            finalRank: {
              in: [1, 2, 3],
            },
          },
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            finalRank: 'asc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Transform to include podium only for FINISHED tournaments
    const tournamentsWithPodium = tournaments.map(tournament => {
      const { tournamentPlayers, createdBy, ...rest } = tournament;
      const baseData = {
        ...rest,
        createdById: createdBy?.id || null,
      };

      if (tournament.status === 'FINISHED' && tournamentPlayers.length >= 3) {
        return {
          ...baseData,
          podium: tournamentPlayers.map(tp => ({
            finalRank: tp.finalRank,
            player: tp.player,
            totalPoints: tp.totalPoints,
            prizeAmount: tp.prizeAmount,
          })),
        };
      }
      return baseData;
    });

    return NextResponse.json(tournamentsWithPodium);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tournois' },
      { status: 500 }
    );
  }
}

// POST create new tournament
export async function POST(request: NextRequest) {
  try {
    // Récupérer l'acteur actuel (User NextAuth + Player lié)
    // autoCreatePlayer=true pour créer automatiquement un Player si nécessaire
    const actor = await getCurrentActor(request, true);

    if (!actor) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier la permission de création de tournoi
    if (!canCreateTournament(actor.player.role)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de créer des tournois' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = tournamentSchema.parse(body);

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: validatedData.seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Saison non trouvée' },
        { status: 404 }
      );
    }

    // Check if season is active
    const now = new Date();
    if (season.endDate && new Date(season.endDate) < now) {
      return NextResponse.json(
        { error: 'Cette saison est terminée' },
        { status: 400 }
      );
    }

    // Extract seasonId, createdById and prepare data for Prisma
    const { seasonId, createdById, ...tournamentData } = validatedData;

    // Créer le tournoi avec le Player.id comme créateur (pas User.id)
    const tournament = await prisma.tournament.create({
      data: {
        ...tournamentData,
        season: {
          connect: { id: seasonId }
        },
        createdBy: {
          connect: { id: actor.player.id }
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du tournoi' },
      { status: 500 }
    );
  }
}
