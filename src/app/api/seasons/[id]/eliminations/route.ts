import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/seasons/[id]/eliminations
 *
 * Retourne toutes les éliminations de la saison avec statistiques
 * Utilisé pour l'export #3 (Classement avec éliminations)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;

    // Vérifier que la saison existe
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Saison non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer tous les tournois FINISHED de la saison
    const tournaments = await prisma.tournament.findMany({
      where: {
        seasonId,
        status: 'FINISHED',
      },
      select: {
        id: true,
      },
    });

    const tournamentIds = tournaments.map((t) => t.id);

    // Récupérer toutes les éliminations de ces tournois
    const eliminations = await prisma.elimination.findMany({
      where: {
        tournamentId: { in: tournamentIds },
      },
      include: {
        eliminator: {
          select: {
            id: true,
            nickname: true,
            firstName: true,
            lastName: true,
          },
        },
        eliminated: {
          select: {
            id: true,
            nickname: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        rank: 'desc', // Plus haut rang = éliminé plus tard dans le tournoi
      },
    });

    // Regrouper les éliminations par éliminateur
    const eliminatorStats = new Map<string, {
      eliminatorId: string;
      eliminatorNickname: string;
      totalEliminations: number;
      victims: Map<string, { nickname: string; count: number }>;
    }>();

    eliminations.forEach((elim) => {
      if (!eliminatorStats.has(elim.eliminatorId)) {
        eliminatorStats.set(elim.eliminatorId, {
          eliminatorId: elim.eliminatorId,
          eliminatorNickname: elim.eliminator.nickname,
          totalEliminations: 0,
          victims: new Map(),
        });
      }

      const stats = eliminatorStats.get(elim.eliminatorId)!;
      stats.totalEliminations++;

      // Compter les victimes
      const victimKey = elim.eliminatedId;
      if (!stats.victims.has(victimKey)) {
        stats.victims.set(victimKey, {
          nickname: elim.eliminated.nickname,
          count: 0,
        });
      }
      stats.victims.get(victimKey)!.count++;
    });

    // Construire la liste des éliminations brutes (pour usage flexible)
    const eliminationsList = eliminations.map((elim) => ({
      id: elim.id,
      tournamentId: elim.tournamentId,
      eliminatorId: elim.eliminatorId,
      eliminatorNickname: elim.eliminator.nickname,
      eliminatedId: elim.eliminatedId,
      eliminatedNickname: elim.eliminated.nickname,
      rank: elim.rank,
      level: elim.level,
      isLeaderKill: elim.isLeaderKill,
    }));

    // Construire les statistiques par éliminateur
    const eliminatorStatsList = Array.from(eliminatorStats.values()).map((stats) => ({
      eliminatorId: stats.eliminatorId,
      eliminatorNickname: stats.eliminatorNickname,
      totalEliminations: stats.totalEliminations,
      victims: Array.from(stats.victims.values()).sort((a, b) => b.count - a.count), // Trier par nombre d'éliminations décroissant
    }));

    // Trier par nombre total d'éliminations
    eliminatorStatsList.sort((a, b) => b.totalEliminations - a.totalEliminations);

    // Statistiques globales
    const totalEliminations = eliminations.length;
    const uniqueEliminators = eliminatorStats.size;
    const leaderKills = eliminations.filter((e) => e.isLeaderKill).length;

    // Top éliminateurs (top 5)
    const topEliminators = eliminatorStatsList.slice(0, 5).map((stats) => ({
      nickname: stats.eliminatorNickname,
      eliminations: stats.totalEliminations,
    }));

    // Joueur le plus éliminé
    const victimCounts = new Map<string, { nickname: string; count: number }>();
    eliminations.forEach((elim) => {
      const key = elim.eliminatedId;
      if (!victimCounts.has(key)) {
        victimCounts.set(key, {
          nickname: elim.eliminated.nickname,
          count: 0,
        });
      }
      victimCounts.get(key)!.count++;
    });

    const topVictims = Array.from(victimCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        year: season.year,
      },
      statistics: {
        totalEliminations,
        uniqueEliminators,
        leaderKills,
        averageEliminationsPerPlayer: uniqueEliminators > 0
          ? Math.round((totalEliminations / uniqueEliminators) * 10) / 10
          : 0,
      },
      topEliminators,
      topVictims,
      eliminatorStats: eliminatorStatsList,
      eliminations: eliminationsList,
    });
  } catch (error) {
    console.error('Error fetching eliminations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des éliminations' },
      { status: 500 }
    );
  }
}
