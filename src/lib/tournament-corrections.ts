/**
 * Corrections a posteriori d'un tournoi terminé.
 *
 * PRINCIPE
 * Les lignes Elimination / BustEvent et les recaves stockées par joueur sont la
 * seule source de vérité. Tous les champs dérivés de TournamentPlayer (rang,
 * compteurs, bonus, pénalités, points, gains) sont RECALCULÉS à partir d'elles,
 * avec exactement les mêmes règles que les routes live :
 *
 * - Sortie "ELIMINATION" : +1 eliminationsCount pour l'éliminateur, et bonus
 *   Leader / Top Shark / Random si la victime est la cible du tournoi.
 * - Sortie "AUTO" (bust sans recave, fin des recaves) : l'éliminateur est
 *   conservé pour l'historique mais ne gagne AUCUN point d'élimination ni bonus
 *   (il a déjà son point de bust).          -> cf. auto-eliminate-busts
 * - Sortie "ABANDON" : pas d'éliminateur.  -> cf. POST /eliminations
 * - Bust : +1 bustEliminations pour le killer, qu'il y ait eu recave ou non.
 * - Malus de recave : computeRecavePenalty(rebuysCount, règles saison, light).
 * - Points : uniquement pour un tournoi CHAMPIONSHIP rattaché à une saison
 *   (même règle que GET /results), sinon rank/elim/bonus = 0.
 *
 * Ce module est pur (aucun accès base) pour être testable exhaustivement.
 */

import { computeRecavePenalty, parseRecavePenaltyRules, type SeasonWithPenaltyRules } from '@/lib/scoring';

// ============================================
// TYPES
// ============================================

export type ExitKind = 'ELIMINATION' | 'AUTO' | 'ABANDON';

/** Une sortie définitive. L'ordre du tableau `exits` est chronologique : exits[0] = premier sorti. */
export interface CorrectionExit {
  id?: string;               // Elimination.id existant (absent = nouvelle ligne)
  eliminatedId: string;      // Player.id
  eliminatorId: string | null; // Player.id (null uniquement pour un abandon)
  kind: ExitKind;
  level: number;
}

/** Une perte de tapis pendant la période de recaves. */
export interface CorrectionBust {
  id?: string;               // BustEvent.id existant (absent = nouvelle ligne)
  eliminatedId: string;      // Player.id
  killerId: string;          // Player.id
  level: number;
  recaveApplied: boolean;
}

/** Recaves d'un joueur (non déductibles des busts : recaves volontaires, light...). */
export interface CorrectionRebuy {
  playerId: string;
  rebuysCount: number;
  lightRebuyUsed: boolean;
}

export interface CorrectionState {
  exits: CorrectionExit[];
  busts: CorrectionBust[];
  rebuys: CorrectionRebuy[];
}

export interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

export interface RankPointsSeason {
  detailedPointsConfig?: unknown;
  pointsFirst: number;
  pointsSecond: number;
  pointsThird: number;
  pointsFourth: number;
  pointsFifth: number;
  pointsSixth: number;
  pointsSeventh: number;
  pointsEighth: number;
  pointsNinth: number;
  pointsTenth: number;
  pointsEleventh: number;
  pointsSixteenth: number;
}

export interface SeasonScoring extends RankPointsSeason, SeasonWithPenaltyRules {
  eliminationPoints: number;
  bustEliminationBonus: number;
  leaderKillerBonus: number;
  topSharkLeaderBonus: number;
  randomKillerBonus: number;
}

export interface CorrectionContext {
  type: string; // TournamentType
  season: SeasonScoring | null;
  seasonLeaderAtStartId: string | null;
  seasonTopSharkAtStartId: string | null;
  randomTargetPlayerId: string | null;
  /** Gains par place configurés (prizePayoutPercents, en €). Vide = pas de config. */
  prizeAmounts: number[];
  /** Gains actuellement stockés par place : utilisés si aucune config (tournois injectés). */
  storedPrizeByRank: Record<number, number | null>;
  /** Player.id de tous les inscrits. */
  playerIds: string[];
}

export interface ComputedPlayer {
  playerId: string;
  finalRank: number;
  eliminationsCount: number;
  bustEliminations: number;
  leaderKills: number;
  topSharkLeaderKills: number;
  randomTargetKills: number;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  prizeAmount: number | null;
}

export interface ComputedExit extends CorrectionExit {
  rank: number;
  isLeaderKill: boolean;
  isTopSharkLeaderKill: boolean;
  isRandomTargetKill: boolean;
  isAutoElimination: boolean;
  isAbandonment: boolean;
}

export interface ComputedResults {
  players: ComputedPlayer[];
  exits: ComputedExit[];
  winnerId: string;
}

/** Champs de TournamentPlayer comparés entre l'état stocké et le recalcul. */
export const COMPARED_FIELDS = [
  'finalRank',
  'eliminationsCount',
  'bustEliminations',
  'leaderKills',
  'topSharkLeaderKills',
  'randomTargetKills',
  'rebuysCount',
  'lightRebuyUsed',
  'rankPoints',
  'eliminationPoints',
  'bonusPoints',
  'penaltyPoints',
  'totalPoints',
  'prizeAmount',
] as const;

export type ComparedField = (typeof COMPARED_FIELDS)[number];
export type StoredPlayer = { playerId: string } & { [K in ComparedField]: ComputedPlayer[K] | null };

export interface PlayerDiff {
  playerId: string;
  changes: Array<{ field: ComparedField; before: unknown; after: unknown }>;
}

// ============================================
// POINTS
// ============================================

/**
 * Points de classement pour une place : config détaillée si présente, sinon champs legacy.
 * Source unique utilisée par les routes /results, /eliminations et les corrections.
 */
export function getRankPointsForPosition(
  rank: number,
  season: RankPointsSeason
): number {
  const config = season.detailedPointsConfig as DetailedPointsConfig | null | undefined;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) return pointsForRank;
    return config.rank19Plus ?? 0;
  }

  const legacyPointsMap: Record<number, number> = {
    1: season.pointsFirst,
    2: season.pointsSecond,
    3: season.pointsThird,
    4: season.pointsFourth,
    5: season.pointsFifth,
    6: season.pointsSixth,
    7: season.pointsSeventh,
    8: season.pointsEighth,
    9: season.pointsNinth,
    10: season.pointsTenth,
  };

  if (legacyPointsMap[rank] !== undefined) return legacyPointsMap[rank];
  if (rank >= 11 && rank <= 15) return season.pointsEleventh;
  return season.pointsSixteenth;
}

// ============================================
// VALIDATION
// ============================================

/** Retourne la liste des erreurs (vide = état valide). Messages destinés à l'admin. */
export function validateCorrectionState(
  state: CorrectionState,
  playerIds: string[],
  nameOf: (playerId: string) => string = (id) => id
): string[] {
  const errors: string[] = [];
  const enrolled = new Set(playerIds);
  const n = playerIds.length;

  if (n < 2) {
    errors.push('Le tournoi doit compter au moins 2 joueurs.');
    return errors;
  }

  // --- Sorties ---
  if (state.exits.length !== n - 1) {
    errors.push(`Il faut exactement ${n - 1} sorties (tous les joueurs sauf le vainqueur), ${state.exits.length} saisies.`);
  }

  const exitIndexByPlayer = new Map<string, number>();
  state.exits.forEach((exit, index) => {
    const who = nameOf(exit.eliminatedId);
    if (!enrolled.has(exit.eliminatedId)) {
      errors.push(`Sortie n°${index + 1} : joueur non inscrit au tournoi.`);
      return;
    }
    if (exitIndexByPlayer.has(exit.eliminatedId)) {
      errors.push(`${who} apparaît plusieurs fois dans l'ordre de sortie.`);
    }
    exitIndexByPlayer.set(exit.eliminatedId, index);

    if (!Number.isInteger(exit.level) || exit.level < 1) {
      errors.push(`${who} : niveau de sortie invalide.`);
    }

    if (exit.kind === 'ABANDON') {
      if (exit.eliminatorId !== null) errors.push(`${who} : un abandon ne doit pas avoir d'éliminateur.`);
      return;
    }
    if (!exit.eliminatorId) {
      errors.push(`${who} : éliminateur manquant.`);
      return;
    }
    if (!enrolled.has(exit.eliminatorId)) {
      errors.push(`${who} : l'éliminateur n'est pas inscrit au tournoi.`);
    } else if (exit.eliminatorId === exit.eliminatedId) {
      errors.push(`${who} ne peut pas s'éliminer lui-même.`);
    }
  });

  // L'éliminateur doit encore être en jeu au moment de la sortie (sorti après, ou vainqueur).
  state.exits.forEach((exit, index) => {
    if (!exit.eliminatorId || exit.kind === 'ABANDON') return;
    const eliminatorExit = exitIndexByPlayer.get(exit.eliminatorId);
    if (eliminatorExit !== undefined && eliminatorExit < index) {
      errors.push(`${nameOf(exit.eliminatedId)} : ${nameOf(exit.eliminatorId)} était déjà sorti à ce moment-là.`);
    }
  });

  const remaining = playerIds.filter((id) => !exitIndexByPlayer.has(id));
  if (state.exits.length === n - 1 && remaining.length !== 1) {
    errors.push('Impossible de déterminer un vainqueur unique.');
  }

  // --- Busts ---
  state.busts.forEach((bust) => {
    if (!enrolled.has(bust.eliminatedId) || !enrolled.has(bust.killerId)) {
      errors.push('Un bust concerne un joueur non inscrit au tournoi.');
      return;
    }
    if (bust.eliminatedId === bust.killerId) {
      errors.push(`Bust de ${nameOf(bust.eliminatedId)} : un joueur ne peut pas se buster lui-même.`);
    }
    if (!Number.isInteger(bust.level) || bust.level < 1) {
      errors.push(`Bust de ${nameOf(bust.eliminatedId)} : niveau invalide.`);
    }
  });

  // --- Recaves ---
  const rebuyPlayers = new Set<string>();
  state.rebuys.forEach((rebuy) => {
    if (!enrolled.has(rebuy.playerId)) {
      errors.push('Des recaves concernent un joueur non inscrit au tournoi.');
      return;
    }
    if (rebuyPlayers.has(rebuy.playerId)) {
      errors.push(`Recaves de ${nameOf(rebuy.playerId)} saisies plusieurs fois.`);
    }
    rebuyPlayers.add(rebuy.playerId);
    if (!Number.isInteger(rebuy.rebuysCount) || rebuy.rebuysCount < 0) {
      errors.push(`Recaves de ${nameOf(rebuy.playerId)} : nombre invalide.`);
    }
  });
  if (rebuyPlayers.size !== enrolled.size) {
    errors.push('Les recaves doivent être renseignées pour chaque joueur.');
  }

  return errors;
}

// ============================================
// RECALCUL
// ============================================

/** Recalcule tous les champs dérivés. L'état doit avoir été validé au préalable. */
export function computeCorrectedResults(state: CorrectionState, ctx: CorrectionContext): ComputedResults {
  const n = ctx.playerIds.length;
  const exited = new Set(state.exits.map((e) => e.eliminatedId));
  const winnerId = ctx.playerIds.find((id) => !exited.has(id));
  if (!winnerId) throw new Error('Aucun vainqueur : état non validé ?');

  const exits: ComputedExit[] = state.exits.map((exit, index) => {
    const countsAsKill = exit.kind === 'ELIMINATION' && exit.eliminatorId !== null;
    return {
      ...exit,
      eliminatorId: exit.kind === 'ABANDON' ? null : exit.eliminatorId,
      rank: n - index,
      isLeaderKill: countsAsKill && exit.eliminatedId === ctx.seasonLeaderAtStartId,
      isTopSharkLeaderKill: countsAsKill && exit.eliminatedId === ctx.seasonTopSharkAtStartId,
      isRandomTargetKill: countsAsKill && exit.eliminatedId === ctx.randomTargetPlayerId,
      isAutoElimination: exit.kind === 'AUTO',
      isAbandonment: exit.kind === 'ABANDON',
    };
  });

  const rankOf = new Map<string, number>(exits.map((e) => [e.eliminatedId, e.rank]));
  rankOf.set(winnerId, 1);

  const rebuyOf = new Map(state.rebuys.map((r) => [r.playerId, r]));
  const season = ctx.season;
  const awardsPoints = ctx.type === 'CHAMPIONSHIP' && season !== null;
  const penaltyRules = season ? parseRecavePenaltyRules(season) : null;

  const players: ComputedPlayer[] = ctx.playerIds.map((playerId) => {
    const kills = exits.filter((e) => e.eliminatorId === playerId && e.kind === 'ELIMINATION');
    const eliminationsCount = kills.length;
    const leaderKills = kills.filter((e) => e.isLeaderKill).length;
    const topSharkLeaderKills = kills.filter((e) => e.isTopSharkLeaderKill).length;
    const randomTargetKills = kills.filter((e) => e.isRandomTargetKill).length;
    const bustEliminations = state.busts.filter((b) => b.killerId === playerId).length;

    const rebuy = rebuyOf.get(playerId) ?? { rebuysCount: 0, lightRebuyUsed: false };
    const penaltyPoints = penaltyRules
      ? computeRecavePenalty(rebuy.rebuysCount, penaltyRules, rebuy.lightRebuyUsed)
      : 0;

    const finalRank = rankOf.get(playerId)!;
    let rankPoints = 0;
    let eliminationPoints = 0;
    let bonusPoints = 0;
    if (awardsPoints) {
      rankPoints = getRankPointsForPosition(finalRank, season);
      eliminationPoints = eliminationsCount * season.eliminationPoints + bustEliminations * season.bustEliminationBonus;
      bonusPoints =
        leaderKills * season.leaderKillerBonus +
        topSharkLeaderKills * season.topSharkLeaderBonus +
        randomTargetKills * season.randomKillerBonus;
    }

    const prizeAmount =
      ctx.prizeAmounts.length > 0
        ? (ctx.prizeAmounts[finalRank - 1] ?? null)
        : (ctx.storedPrizeByRank[finalRank] ?? null);

    return {
      playerId,
      finalRank,
      eliminationsCount,
      bustEliminations,
      leaderKills,
      topSharkLeaderKills,
      randomTargetKills,
      rebuysCount: rebuy.rebuysCount,
      lightRebuyUsed: rebuy.lightRebuyUsed,
      rankPoints,
      eliminationPoints,
      bonusPoints,
      penaltyPoints,
      totalPoints: rankPoints + eliminationPoints + bonusPoints + penaltyPoints,
      prizeAmount,
    };
  });

  return { players, exits, winnerId };
}

/** Champs qui diffèrent entre l'état stocké et le recalcul, joueur par joueur. */
export function diffPlayers(stored: StoredPlayer[], computed: ComputedPlayer[]): PlayerDiff[] {
  const storedById = new Map(stored.map((s) => [s.playerId, s]));
  const diffs: PlayerDiff[] = [];
  for (const c of computed) {
    const s = storedById.get(c.playerId);
    const changes = COMPARED_FIELDS.filter((f) => (s ? s[f] : null) !== c[f]).map((field) => ({
      field,
      before: s ? s[field] : null,
      after: c[field],
    }));
    if (changes.length > 0) diffs.push({ playerId: c.playerId, changes });
  }
  return diffs;
}

// ============================================
// CONSTRUCTION DE L'ÉTAT DEPUIS LA BASE
// ============================================

export interface DbTournamentPlayer {
  id: string;
  playerId: string;
  finalRank: number | null;
  rebuysCount: number;
  lightRebuyUsed: boolean;
}

export interface DbElimination {
  id: string;
  eliminatedId: string;
  eliminatorId: string | null;
  rank: number;
  level: number;
  isAutoElimination: boolean;
  isAbandonment: boolean;
}

export interface DbBust {
  id: string;
  eliminatedId: string;     // TournamentPlayer.id
  killerId: string | null;  // TournamentPlayer.id
  level: number;
  recaveApplied: boolean;
}

/**
 * Reconstruit l'état éditable à partir des lignes en base.
 * Les anomalies (sortie sans ligne Elimination, doublons, bust sans killer...) sont
 * signalées dans `warnings` : l'état produit peut alors être invalide, à corriger par l'admin.
 */
export function buildStateFromDb(
  tournamentPlayers: DbTournamentPlayer[],
  eliminations: DbElimination[],
  busts: DbBust[]
): { state: CorrectionState; warnings: string[] } {
  const warnings: string[] = [];
  const playerIdByTp = new Map(tournamentPlayers.map((tp) => [tp.id, tp.playerId]));

  // Ordre de sortie : rang décroissant (premier sorti = rang le plus élevé).
  // Les joueurs sans rang sont placés en tête (à corriger par l'admin).
  const sorted = [...tournamentPlayers].sort((a, b) => (b.finalRank ?? Infinity) - (a.finalRank ?? Infinity));
  const unranked = sorted.filter((tp) => tp.finalRank === null);
  if (unranked.length > 0) warnings.push(`${unranked.length} joueur(s) sans classement final.`);

  const winners = sorted.filter((tp) => tp.finalRank === 1);
  const winner = winners[0] ?? null;
  if (winners.length !== 1) warnings.push('Vainqueur introuvable ou non unique.');

  const exits: CorrectionExit[] = [];
  for (const tp of sorted) {
    if (winner && tp.id === winner.id) continue;
    const rows = eliminations.filter((e) => e.eliminatedId === tp.playerId);
    if (rows.length > 1) warnings.push('Plusieurs lignes d\'élimination pour un même joueur : seule celle correspondant à son rang est conservée.');
    const row = rows.find((e) => e.rank === tp.finalRank) ?? rows[0];
    if (!row) {
      warnings.push('Une sortie n\'a pas de ligne d\'élimination : choisir l\'éliminateur.');
      exits.push({ eliminatedId: tp.playerId, eliminatorId: null, kind: 'ELIMINATION', level: 1 });
      continue;
    }
    const kind: ExitKind = row.isAbandonment ? 'ABANDON' : row.isAutoElimination ? 'AUTO' : 'ELIMINATION';
    exits.push({
      id: row.id,
      eliminatedId: tp.playerId,
      eliminatorId: kind === 'ABANDON' ? null : row.eliminatorId,
      kind,
      level: row.level,
    });
  }

  const stateBusts: CorrectionBust[] = [];
  for (const b of busts) {
    const eliminatedId = playerIdByTp.get(b.eliminatedId);
    const killerId = b.killerId ? playerIdByTp.get(b.killerId) : undefined;
    if (!eliminatedId) continue;
    if (!killerId) warnings.push('Un bust n\'a pas de killer : à compléter.');
    stateBusts.push({
      id: b.id,
      eliminatedId,
      killerId: killerId ?? '',
      level: b.level,
      recaveApplied: b.recaveApplied,
    });
  }

  const rebuys: CorrectionRebuy[] = tournamentPlayers.map((tp) => ({
    playerId: tp.playerId,
    rebuysCount: tp.rebuysCount,
    lightRebuyUsed: tp.lightRebuyUsed,
  }));

  return { state: { exits, busts: stateBusts, rebuys }, warnings: Array.from(new Set(warnings)) };
}

// ============================================
// RÉSUMÉ LISIBLE (historique)
// ============================================

export function summarizeStateChanges(
  before: CorrectionState,
  after: CorrectionState,
  nameOf: (playerId: string) => string
): string[] {
  const lines: string[] = [];
  const n = after.exits.length + 1;

  const beforeExit = new Map(before.exits.map((e, i) => [e.eliminatedId, { ...e, rank: n - i }]));
  after.exits.forEach((e, i) => {
    const rank = n - i;
    const prev = beforeExit.get(e.eliminatedId);
    const who = nameOf(e.eliminatedId);
    if (!prev) {
      lines.push(`Sortie ajoutée : ${who} (${rank}e)`);
      return;
    }
    if (prev.rank !== rank) lines.push(`${who} : ${prev.rank}e → ${rank}e`);
    if (prev.eliminatorId !== e.eliminatorId) {
      lines.push(`${who} : éliminateur ${prev.eliminatorId ? nameOf(prev.eliminatorId) : 'aucun'} → ${e.eliminatorId ? nameOf(e.eliminatorId) : 'aucun'}`);
    }
    if (prev.kind !== e.kind) lines.push(`${who} : type de sortie ${prev.kind} → ${e.kind}`);
    if (prev.level !== e.level) lines.push(`${who} : niveau de sortie ${prev.level} → ${e.level}`);
  });
  const afterExited = new Set(after.exits.map((e) => e.eliminatedId));
  before.exits.forEach((e) => {
    if (!afterExited.has(e.eliminatedId)) lines.push(`${nameOf(e.eliminatedId)} : n'est plus sorti (vainqueur)`);
  });

  const bustLabel = (b: CorrectionBust) => `${nameOf(b.eliminatedId)} par ${nameOf(b.killerId)} (niv. ${b.level})`;
  const afterBustIds = new Set(after.busts.filter((b) => b.id).map((b) => b.id));
  before.busts.forEach((b) => {
    if (b.id && !afterBustIds.has(b.id)) lines.push(`Bust supprimé : ${bustLabel(b)}`);
  });
  const beforeBustById = new Map(before.busts.filter((b) => b.id).map((b) => [b.id, b]));
  after.busts.forEach((b) => {
    const prev = b.id ? beforeBustById.get(b.id) : undefined;
    if (!prev) {
      lines.push(`Bust ajouté : ${bustLabel(b)}`);
    } else if (
      prev.eliminatedId !== b.eliminatedId ||
      prev.killerId !== b.killerId ||
      prev.level !== b.level ||
      prev.recaveApplied !== b.recaveApplied
    ) {
      lines.push(`Bust modifié : ${bustLabel(prev)} → ${bustLabel(b)}${b.recaveApplied ? '' : ' (sans recave)'}`);
    }
  });

  const beforeRebuy = new Map(before.rebuys.map((r) => [r.playerId, r]));
  after.rebuys.forEach((r) => {
    const prev = beforeRebuy.get(r.playerId);
    if (!prev) return;
    if (prev.rebuysCount !== r.rebuysCount) lines.push(`${nameOf(r.playerId)} : recaves ${prev.rebuysCount} → ${r.rebuysCount}`);
    if (prev.lightRebuyUsed !== r.lightRebuyUsed) {
      lines.push(`${nameOf(r.playerId)} : recave light ${r.lightRebuyUsed ? 'ajoutée' : 'retirée'}`);
    }
  });

  return lines;
}
