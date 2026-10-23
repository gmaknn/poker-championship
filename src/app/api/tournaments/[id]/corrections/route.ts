import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isAdminMultiRole } from '@/lib/permissions';
import {
  buildStateFromDb,
  computeCorrectedResults,
  diffPlayers,
  summarizeStateChanges,
  validateCorrectionState,
  type CorrectionContext,
  type CorrectionState,
  type StoredPlayer,
} from '@/lib/tournament-corrections';

// Corrections a posteriori d'un tournoi TERMINÉ (ADMIN / SUPERADMIN uniquement).
//   GET  : état éditable + incohérences actuelles + historique
//   POST : { mode: 'preview' | 'apply', state, baseVersion } — voir src/lib/tournament-corrections.ts

const exitSchema = z.object({
  id: z.string().optional(),
  eliminatedId: z.string().min(1),
  eliminatorId: z.string().min(1).nullable(),
  kind: z.enum(['ELIMINATION', 'AUTO', 'ABANDON']),
  level: z.number().int(),
});

const bustSchema = z.object({
  id: z.string().optional(),
  eliminatedId: z.string().min(1),
  killerId: z.string(),
  level: z.number().int(),
  recaveApplied: z.boolean(),
});

const rebuySchema = z.object({
  playerId: z.string().min(1),
  rebuysCount: z.number().int(),
  lightRebuyUsed: z.boolean(),
});

const postSchema = z.object({
  mode: z.enum(['preview', 'apply']),
  baseVersion: z.string(),
  state: z.object({
    exits: z.array(exitSchema),
    busts: z.array(bustSchema),
    rebuys: z.array(rebuySchema),
  }),
});

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(request: NextRequest) {
  const player = await getCurrentPlayer(request);
  if (!player) return { ok: false as const, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const isScoped = '_tournamentScope' in player && Boolean((player as { _tournamentScope?: string })._tournamentScope);
  if (isScoped || player.status !== 'ACTIVE' || !isAdminMultiRole(player.role, player.additionalRoles)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 }) };
  }
  return { ok: true as const, player };
}

async function loadTournament(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
      tournamentPlayers: {
        include: { player: { select: { id: true, firstName: true, lastName: true, nickname: true } } },
      },
      eliminations: true,
      bustEvents: true,
    },
  });
}

type LoadedTournament = NonNullable<Awaited<ReturnType<typeof loadTournament>>>;

function buildContext(t: LoadedTournament): CorrectionContext {
  const storedPrizeByRank: Record<number, number | null> = {};
  for (const tp of t.tournamentPlayers) {
    if (tp.finalRank !== null) storedPrizeByRank[tp.finalRank] = tp.prizeAmount;
  }
  return {
    type: t.type,
    season: t.season,
    seasonLeaderAtStartId: t.seasonLeaderAtStartId,
    seasonTopSharkAtStartId: t.seasonTopSharkAtStartId,
    randomTargetPlayerId: t.randomTargetPlayerId,
    prizeAmounts: (t.prizePayoutPercents as number[] | null) ?? [],
    storedPrizeByRank,
    playerIds: t.tournamentPlayers.map((tp) => tp.playerId),
  };
}

function nameResolver(t: LoadedTournament) {
  const names = new Map(
    t.tournamentPlayers.map((tp) => [tp.playerId, `${tp.player.firstName} ${tp.player.lastName}`.trim() || tp.player.nickname])
  );
  return (playerId: string) => names.get(playerId) ?? 'Joueur inconnu';
}

function currentState(t: LoadedTournament) {
  return buildStateFromDb(t.tournamentPlayers, t.eliminations, t.bustEvents);
}

function storedPlayers(t: LoadedTournament): StoredPlayer[] {
  return t.tournamentPlayers.map((tp) => ({
    playerId: tp.playerId,
    finalRank: tp.finalRank,
    eliminationsCount: tp.eliminationsCount,
    bustEliminations: tp.bustEliminations,
    leaderKills: tp.leaderKills,
    topSharkLeaderKills: tp.topSharkLeaderKills,
    randomTargetKills: tp.randomTargetKills,
    rebuysCount: tp.rebuysCount,
    lightRebuyUsed: tp.lightRebuyUsed,
    rankPoints: tp.rankPoints,
    eliminationPoints: tp.eliminationPoints,
    bonusPoints: tp.bonusPoints,
    penaltyPoints: tp.penaltyPoints,
    totalPoints: tp.totalPoints,
    prizeAmount: tp.prizeAmount,
  }));
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: tournamentId } = await params;
    const tournament = await loadTournament(tournamentId);
    if (!tournament) return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 });
    if (tournament.status !== 'FINISHED') {
      return NextResponse.json({ error: 'Seuls les tournois terminés peuvent être corrigés' }, { status: 400 });
    }

    const nameOf = nameResolver(tournament);
    const ctx = buildContext(tournament);
    const { state, warnings } = currentState(tournament);
    const errors = validateCorrectionState(state, ctx.playerIds, nameOf);
    // Incohérences déjà présentes : différence entre les compteurs stockés et le recalcul des lignes actuelles
    const drift = errors.length === 0 ? diffPlayers(storedPlayers(tournament), computeCorrectedResults(state, ctx).players) : [];

    const history = await prisma.tournamentCorrection.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, authorName: true, summary: true, createdAt: true },
    });

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        hasSeason: tournament.season !== null,
      },
      baseVersion: tournament.updatedAt.toISOString(),
      players: tournament.tournamentPlayers
        .map((tp) => ({
          playerId: tp.playerId,
          firstName: tp.player.firstName,
          lastName: tp.player.lastName,
          nickname: tp.player.nickname,
        }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr')),
      state,
      warnings,
      errors,
      drift,
      history,
    });
  } catch (error) {
    console.error('Error loading tournament corrections:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id: tournamentId } = await params;
    const body = postSchema.parse(await request.json());
    const nextState: CorrectionState = body.state;

    const tournament = await loadTournament(tournamentId);
    if (!tournament) return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 });
    if (tournament.status !== 'FINISHED') {
      return NextResponse.json({ error: 'Seuls les tournois terminés peuvent être corrigés' }, { status: 400 });
    }
    if (tournament.updatedAt.toISOString() !== body.baseVersion) {
      return NextResponse.json(
        { error: 'Le tournoi a été modifié entre-temps. Rechargez la page avant de corriger.' },
        { status: 409 }
      );
    }

    const nameOf = nameResolver(tournament);
    const ctx = buildContext(tournament);
    const errors = validateCorrectionState(nextState, ctx.playerIds, nameOf);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: body.mode === 'apply' ? 400 : 200 });
    }

    const computed = computeCorrectedResults(nextState, ctx);
    const diff = diffPlayers(storedPlayers(tournament), computed.players);
    const { state: beforeState } = currentState(tournament);
    const summary = summarizeStateChanges(beforeState, nextState, nameOf);

    if (body.mode === 'preview') {
      return NextResponse.json({ errors: [], diff, summary, results: computed.players });
    }

    if (diff.length === 0 && summary.length === 0) {
      return NextResponse.json({ error: 'Aucun changement à appliquer' }, { status: 400 });
    }

    const tpIdByPlayer = new Map(tournament.tournamentPlayers.map((tp) => [tp.playerId, tp.id]));
    const existingElims = new Map(tournament.eliminations.map((e) => [e.id, e]));
    const existingBusts = new Map(tournament.bustEvents.map((b) => [b.id, b]));
    const tournamentStart = (tournament.timerStartedAt ?? tournament.date).getTime();

    // Horodatage des sorties : on réutilise les heures existantes dans le nouvel ordre
    // pour que l'historique (trié par createdAt) reste cohérent avec le classement.
    const pool = computed.exits
      .filter((e) => e.id && existingElims.has(e.id))
      .map((e) => existingElims.get(e.id!)!.createdAt.getTime())
      .sort((a, b) => a - b);
    let previous = tournamentStart - 1;
    const exitTimes = computed.exits.map((e) => {
      const candidate = e.id && existingElims.has(e.id) ? pool.shift()! : previous + 1000;
      previous = Math.max(candidate, previous + 1);
      return new Date(previous);
    });

    const author = auth.player;
    const authorName = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || author.nickname || 'Admin';

    await prisma.$transaction(async (tx) => {
      // Garde-fou concurrence : relecture de la version dans la transaction
      const fresh = await tx.tournament.findUnique({ where: { id: tournamentId }, select: { updatedAt: true } });
      if (!fresh || fresh.updatedAt.toISOString() !== body.baseVersion) throw new Error('STALE_VERSION');

      // 1. Rangs : passage par des rangs temporaires négatifs (@@unique([tournamentId, finalRank]))
      let temp = -1;
      for (const tp of tournament.tournamentPlayers) {
        await tx.tournamentPlayer.update({ where: { id: tp.id }, data: { finalRank: temp-- } });
      }
      for (const p of computed.players) {
        await tx.tournamentPlayer.update({
          where: { id: tpIdByPlayer.get(p.playerId)! },
          data: {
            finalRank: p.finalRank,
            eliminationsCount: p.eliminationsCount,
            bustEliminations: p.bustEliminations,
            leaderKills: p.leaderKills,
            topSharkLeaderKills: p.topSharkLeaderKills,
            randomTargetKills: p.randomTargetKills,
            rebuysCount: p.rebuysCount,
            lightRebuyUsed: p.lightRebuyUsed,
            rankPoints: p.rankPoints,
            eliminationPoints: p.eliminationPoints,
            bonusPoints: p.bonusPoints,
            penaltyPoints: p.penaltyPoints,
            totalPoints: p.totalPoints,
            prizeAmount: p.prizeAmount,
          },
        });
      }

      // 2. Sorties
      const keptElimIds = computed.exits.filter((e) => e.id && existingElims.has(e.id)).map((e) => e.id!);
      await tx.elimination.deleteMany({ where: { tournamentId, id: { notIn: keptElimIds } } });
      for (const [index, e] of computed.exits.entries()) {
        const data = {
          eliminatedId: e.eliminatedId,
          eliminatorId: e.eliminatorId,
          rank: e.rank,
          level: e.level,
          isLeaderKill: e.isLeaderKill,
          isTopSharkLeaderKill: e.isTopSharkLeaderKill,
          isRandomTargetKill: e.isRandomTargetKill,
          isAutoElimination: e.isAutoElimination,
          isAbandonment: e.isAbandonment,
          createdAt: exitTimes[index],
        };
        if (e.id && existingElims.has(e.id)) {
          await tx.elimination.update({ where: { id: e.id }, data });
        } else {
          await tx.elimination.create({ data: { ...data, tournamentId } });
        }
      }

      // 3. Busts (eliminatedId / killerId = TournamentPlayer.id)
      const keptBustIds = nextState.busts.filter((b) => b.id && existingBusts.has(b.id)).map((b) => b.id!);
      await tx.bustEvent.deleteMany({ where: { tournamentId, id: { notIn: keptBustIds } } });
      for (const b of nextState.busts) {
        const data = {
          eliminatedId: tpIdByPlayer.get(b.eliminatedId)!,
          killerId: tpIdByPlayer.get(b.killerId)!,
          level: b.level,
          recaveApplied: b.recaveApplied,
        };
        if (b.id && existingBusts.has(b.id)) {
          await tx.bustEvent.update({ where: { id: b.id }, data });
        } else {
          // Nouveau bust : horodaté juste après le dernier bust connu de niveau <= au sien
          const before = tournament.bustEvents.filter((x) => x.level <= b.level).map((x) => x.createdAt.getTime());
          const createdAt = new Date((before.length > 0 ? Math.max(...before) : tournamentStart) + 1000);
          await tx.bustEvent.create({ data: { ...data, tournamentId, createdAt } });
        }
      }

      // 4. Nouvelle version + historique
      await tx.tournament.update({ where: { id: tournamentId }, data: { updatedAt: new Date() } });
      await tx.tournamentCorrection.create({
        data: {
          tournamentId,
          authorId: author.id.startsWith('tournament-admin-') ? null : author.id,
          authorName,
          summary: summary.join('\n') || 'Recalcul des points (aucun changement de saisie)',
          before: beforeState as unknown as Prisma.InputJsonValue,
          after: nextState as unknown as Prisma.InputJsonValue,
        },
      });
    });

    return NextResponse.json({ success: true, diff, summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'STALE_VERSION') {
      return NextResponse.json(
        { error: 'Le tournoi a été modifié entre-temps. Rechargez la page avant de corriger.' },
        { status: 409 }
      );
    }
    console.error('Error applying tournament correction:', error);
    return NextResponse.json({ error: "Erreur lors de l'application de la correction" }, { status: 500 });
  }
}
