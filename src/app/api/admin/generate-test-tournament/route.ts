import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isAdminMultiRole, hasPermissionMultiRole, PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/generate-test-tournament
 * Génère un tournoi test à partir du template (isTestTemplate === true)
 * Clone : blinds, config jetons, buy-in, starting chips, seuil de casse, seatsPerTable, joueurs
 * Le tournoi généré est marqué isTestGenerated (caché de la liste)
 */
export async function POST(request: NextRequest) {
  try {
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // TD ou Admin peut générer
    const canCreate = hasPermissionMultiRole(
      currentPlayer.role,
      currentPlayer.additionalRoles,
      PERMISSIONS.CREATE_TOURNAMENT
    );
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Permission insuffisante' },
        { status: 403 }
      );
    }

    // 1. Trouver le tournoi template
    const template = await prisma.tournament.findFirst({
      where: { isTestTemplate: true },
      include: {
        blindLevels: { orderBy: { level: 'asc' } },
        chipConfig: true,
        chipDenominations: true,
        tournamentPlayers: {
          select: { playerId: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Aucun tournoi template. Marquez un tournoi comme template.' },
        { status: 404 }
      );
    }

    // 2. Générer le nom et la date
    const now = new Date();
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const testName = `TEST — ${dd}/${mm} ${hh}:${min}`;

    // 3. Créer le tournoi test dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer le tournoi
      const newTournament = await tx.tournament.create({
        data: {
          name: testName,
          date: now,
          status: 'PLANNED',
          isTestGenerated: true,
          seasonId: template.seasonId,
          createdById: template.createdById,
          buyInAmount: template.buyInAmount,
          startingChips: template.startingChips,
          targetDuration: template.targetDuration,
          levelDuration: template.levelDuration,
          seatsPerTable: template.seatsPerTable,
          tableBreakThreshold: template.tableBreakThreshold,
          type: template.type,
          rebuyEndLevel: template.rebuyEndLevel,
          maxRebuysPerPlayer: template.maxRebuysPerPlayer,
          lightRebuyEnabled: template.lightRebuyEnabled,
          lightRebuyMinBB: template.lightRebuyMinBB,
          lightRebuyAmount: template.lightRebuyAmount,
        },
      });

      // Copier les blind levels
      if (template.blindLevels.length > 0) {
        await tx.blindLevel.createMany({
          data: template.blindLevels.map((bl) => ({
            tournamentId: newTournament.id,
            level: bl.level,
            smallBlind: bl.smallBlind,
            bigBlind: bl.bigBlind,
            ante: bl.ante,
            duration: bl.duration,
            isBreak: bl.isBreak,
            rebalanceTables: bl.rebalanceTables,
            isRebuyEnd: bl.isRebuyEnd,
          })),
        });
      }

      // Copier la config jetons
      if (template.chipConfig) {
        await tx.tournamentChipConfig.create({
          data: {
            tournamentId: newTournament.id,
            chipSetsUsed: template.chipConfig.chipSetsUsed as any,
            distribution: template.chipConfig.distribution as any,
            playersCount: template.chipConfig.playersCount,
            stackSize: template.chipConfig.stackSize,
            rebuysExpected: template.chipConfig.rebuysExpected,
          },
        });
      }

      // Copier les dénominations de jetons
      if (template.chipDenominations.length > 0) {
        await tx.chipDenomination.createMany({
          data: template.chipDenominations.map((d) => ({
            tournamentId: newTournament.id,
            value: d.value,
            color: d.color,
            colorSecondary: d.colorSecondary,
            quantity: d.quantity,
            order: d.order,
            isDefault: false,
          })),
        });
      }

      // Inscrire les mêmes joueurs que le template
      const playerIds = template.tournamentPlayers.map((tp) => tp.playerId);
      if (playerIds.length > 0) {
        await tx.tournamentPlayer.createMany({
          data: playerIds.map((playerId) => ({
            tournamentId: newTournament.id,
            playerId,
            hasPaid: true,
          })),
        });

        // Mettre à jour le compteur de joueurs
        await tx.tournament.update({
          where: { id: newTournament.id },
          data: { totalPlayers: playerIds.length },
        });
      }

      return { tournament: newTournament, playerCount: playerIds.length };
    });

    return NextResponse.json({
      id: result.tournament.id,
      name: result.tournament.name,
      playerCount: result.playerCount,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating test tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du tournoi test' },
      { status: 500 }
    );
  }
}
