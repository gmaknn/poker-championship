'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, History, Plus, RotateCcw, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionCard } from '@/components/ui/section-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  validateCorrectionState,
  type ComparedField,
  type CorrectionBust,
  type CorrectionExit,
  type CorrectionState,
  type ExitKind,
  type PlayerDiff,
} from '@/lib/tournament-corrections';

interface PlayerInfo {
  playerId: string;
  firstName: string;
  lastName: string;
  nickname: string;
}

interface HistoryEntry {
  id: string;
  authorName: string;
  summary: string;
  createdAt: string;
}

interface CorrectionsData {
  tournament: { id: string; name: string | null; type: string; hasSeason: boolean };
  baseVersion: string;
  players: PlayerInfo[];
  state: CorrectionState;
  warnings: string[];
  errors: string[];
  drift: PlayerDiff[];
  history: HistoryEntry[];
}

interface PreviewData {
  diff: PlayerDiff[];
  summary: string[];
}

/** Détails de sortie rattachés au joueur (la place est donnée par sa position dans `order`). */
type ExitDetails = Omit<CorrectionExit, 'eliminatedId'>;

interface Draft {
  /** Player.id par place : order[0] = vainqueur, order[n-1] = premier sorti. */
  order: string[];
  exitOf: Record<string, ExitDetails>;
  busts: CorrectionBust[];
  rebuys: CorrectionState['rebuys'];
}

const KIND_LABELS: Record<ExitKind, string> = {
  ELIMINATION: 'Élimination',
  AUTO: 'Bust sans recave',
  ABANDON: 'Abandon',
};

const FIELD_LABELS: Record<ComparedField, string> = {
  finalRank: 'Place',
  eliminationsCount: 'Éliminations',
  bustEliminations: 'Busts',
  leaderKills: 'Leader Kills',
  topSharkLeaderKills: 'Top Shark Kills',
  randomTargetKills: 'Random Kills',
  rebuysCount: 'Recaves',
  lightRebuyUsed: 'Recave light',
  rankPoints: 'Pts place',
  eliminationPoints: 'Pts élim.',
  bonusPoints: 'Bonus',
  penaltyPoints: 'Malus',
  totalPoints: 'Total',
  prizeAmount: 'Gain',
};

const NONE = '__none__';

function toDraft(state: CorrectionState, playerIds: string[]): Draft {
  const exited = new Set(state.exits.map((e) => e.eliminatedId));
  const winners = playerIds.filter((id) => !exited.has(id));
  const exitOf: Draft['exitOf'] = {};
  for (const { eliminatedId, ...details } of state.exits) exitOf[eliminatedId] = details;
  return {
    order: [...winners, ...state.exits.map((e) => e.eliminatedId).reverse()],
    exitOf,
    busts: state.busts.map((b) => ({ ...b })),
    rebuys: state.rebuys.map((r) => ({ ...r })),
  };
}

function toState(draft: Draft): CorrectionState {
  // Chronologique : premier sorti d'abord, vainqueur exclu
  const exits = draft.order
    .slice(1)
    .reverse()
    .map((playerId) => {
      const d = draft.exitOf[playerId] ?? { eliminatorId: null, kind: 'ELIMINATION' as ExitKind, level: 1 };
      return { ...d, eliminatedId: playerId, eliminatorId: d.kind === 'ABANDON' ? null : d.eliminatorId };
    });
  return { exits, busts: draft.busts, rebuys: draft.rebuys };
}

function formatValue(field: ComparedField, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  if (field === 'prizeAmount') return `${value} €`;
  return String(value);
}

export default function TournamentCorrections({ tournamentId, onUpdate }: { tournamentId: string; onUpdate?: () => void }) {
  const [data, setData] = useState<CorrectionsData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showDrift, setShowDrift] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/corrections`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error || 'Erreur de chargement');
        return;
      }
      setData(json);
      setDraft(toDraft(json.state, json.players.map((p: PlayerInfo) => p.playerId)));
    } catch {
      setLoadError('Erreur de chargement');
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = useMemo(() => {
    const names = new Map((data?.players ?? []).map((p) => [p.playerId, `${p.firstName} ${p.lastName}`]));
    return (id: string | null) => (id ? (names.get(id) ?? '?') : '—');
  }, [data]);

  const state = useMemo(() => (draft ? toState(draft) : null), [draft]);
  const isDirty = useMemo(
    () => Boolean(data && state && JSON.stringify(state) !== JSON.stringify(toState(toDraft(data.state, data.players.map((p) => p.playerId))))),
    [data, state]
  );
  const errors = useMemo(
    () => (data && state ? validateCorrectionState(state, data.players.map((p) => p.playerId), (id) => nameOf(id)) : []),
    [data, state, nameOf]
  );

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Correction impossible</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }
  if (!data || !draft || !state) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  const players = data.players;

  // --- Mutations du brouillon ---
  const updateExit = (playerId: string, patch: Partial<ExitDetails>) =>
    setDraft((d) => d && { ...d, exitOf: { ...d.exitOf, [playerId]: { ...d.exitOf[playerId], ...patch } } });

  /** Échange les places index et index+1 (index 0 = vainqueur). */
  const swapWithNext = (index: number) =>
    setDraft((d) => {
      if (!d || index < 0 || index + 1 >= d.order.length) return d;
      const order = [...d.order];
      const a = order[index];
      const b = order[index + 1];
      [order[index], order[index + 1]] = [b, a];
      const exitOf = { ...d.exitOf };
      if (index === 0) {
        // Le 2e devient vainqueur : sa ligne de sortie passe à l'ancien vainqueur, éliminé par lui
        exitOf[a] = { ...d.exitOf[b], eliminatorId: d.exitOf[b]?.kind === 'ABANDON' ? null : b };
        delete exitOf[b];
      }
      return { ...d, order, exitOf };
    });

  const updateBust = (index: number, patch: Partial<CorrectionBust>) =>
    setDraft((d) => d && { ...d, busts: d.busts.map((b, i) => (i === index ? { ...b, ...patch } : b)) });

  const addBust = () =>
    setDraft(
      (d) =>
        d && {
          ...d,
          busts: [
            ...d.busts,
            { eliminatedId: players[0].playerId, killerId: players[1]?.playerId ?? '', level: 1, recaveApplied: true },
          ],
        }
    );

  const updateRebuy = (playerId: string, patch: Partial<CorrectionState['rebuys'][number]>) =>
    setDraft((d) => d && { ...d, rebuys: d.rebuys.map((r) => (r.playerId === playerId ? { ...r, ...patch } : r)) });

  const reset = () => setDraft(toDraft(data.state, players.map((p) => p.playerId)));

  // --- Serveur ---
  const post = async (mode: 'preview' | 'apply') => {
    setIsBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/corrections`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, state, baseVersion: data.baseVersion }),
      });
      const json = await res.json();
      if (!res.ok || json.errors?.length) {
        toast.error(json.error || json.errors?.join('\n') || 'Erreur');
        return null;
      }
      return json;
    } catch {
      toast.error('Erreur réseau');
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const openPreview = async () => {
    const json = await post('preview');
    if (json) setPreview({ diff: json.diff, summary: json.summary });
  };

  const apply = async () => {
    const json = await post('apply');
    if (!json) return;
    toast.success('Correction appliquée');
    setPreview(null);
    await load();
    onUpdate?.();
  };

  const playerOptions = (exclude?: string) =>
    players
      .filter((p) => p.playerId !== exclude)
      .map((p) => (
        <SelectItem key={p.playerId} value={p.playerId}>
          {p.firstName} {p.lastName}
        </SelectItem>
      ));

  return (
    <div className="space-y-6">
      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertTitle>Corriger les résultats</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <p>Modifiez l&apos;ordre de sortie, les éliminateurs, les busts et les recaves, puis vérifiez l&apos;aperçu avant de valider. Tous les points sont recalculés automatiquement.</p>
          <p className="text-muted-foreground">
            Élimination saisie au lieu d&apos;un bust : ajoutez le bust, +1 recave au joueur, puis placez sa vraie sortie dans l&apos;ordre.
            Bust saisi au lieu d&apos;une sortie : supprimez le bust, −1 recave, et réglez sa sortie (type « Bust sans recave » si besoin).
          </p>
        </AlertDescription>
      </Alert>

      {data.warnings.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Données incomplètes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">{data.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </AlertDescription>
        </Alert>
      )}

      {data.drift.length > 0 && (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Points actuels incohérents ({data.drift.length} joueur{data.drift.length > 1 ? 's' : ''})</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Les points stockés ne correspondent pas aux sorties et busts enregistrés (correction manuelle passée ?). La prochaine validation les remettra en cohérence : vérifiez l&apos;aperçu.</p>
            <Button variant="outline" size="sm" onClick={() => setShowDrift((v) => !v)}>
              {showDrift ? 'Masquer' : 'Voir le détail'}
            </Button>
            {showDrift && <DiffTable diff={data.drift} nameOf={nameOf} />}
          </AlertDescription>
        </Alert>
      )}

      {/* --- Ordre de sortie --- */}
      <SectionCard title="Classement et sorties" description="Du vainqueur au premier sorti. ↑↓ pour inverser deux places.">
        <div className="space-y-2">
          {draft.order.map((playerId, index) => {
            const exit = draft.exitOf[playerId];
            const isWinner = index === 0;
            return (
              <div key={playerId} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2">
                <Badge variant={isWinner ? 'default' : 'secondary'} className="w-10 justify-center">{index + 1}</Badge>
                <span className="font-medium min-w-[9rem] flex-1">{nameOf(playerId)}</span>
                {isWinner ? (
                  <span className="text-sm text-muted-foreground">Vainqueur</span>
                ) : (
                  <>
                    <Select value={exit?.kind ?? 'ELIMINATION'} onValueChange={(v) => updateExit(playerId, { kind: v as ExitKind, eliminatorId: v === 'ABANDON' ? null : exit?.eliminatorId ?? null })}>
                      <SelectTrigger className="w-[11rem] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(KIND_LABELS) as ExitKind[]).map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {exit?.kind !== 'ABANDON' && (
                      <Select value={exit?.eliminatorId ?? NONE} onValueChange={(v) => updateExit(playerId, { eliminatorId: v === NONE ? null : v })}>
                        <SelectTrigger className="w-[12rem] h-9"><SelectValue placeholder="Éliminé par…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE} disabled>Éliminé par…</SelectItem>
                          {playerOptions(playerId)}
                        </SelectContent>
                      </Select>
                    )}
                    <label className="flex items-center gap-1 text-sm text-muted-foreground">
                      Niv.
                      <Input
                        type="number"
                        min={1}
                        className="w-16 h-9"
                        value={exit?.level ?? 1}
                        onChange={(e) => updateExit(playerId, { level: parseInt(e.target.value, 10) || 0 })}
                      />
                    </label>
                  </>
                )}
                <div className="flex gap-1 ml-auto">
                  <Button variant="ghost" size="icon" className="h-9 w-9" disabled={index === 0} onClick={() => swapWithNext(index - 1)} title="Monter d'une place">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" disabled={index === draft.order.length - 1} onClick={() => swapWithNext(index)} title="Descendre d'une place">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* --- Busts --- */}
      <SectionCard
        title={`Busts pendant les recaves (${draft.busts.length})`}
        description="Chaque bust rapporte les points de bust au killer, avec ou sans recave."
        actions={<Button size="sm" variant="outline" onClick={addBust}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
      >
        <div className="space-y-2">
          {draft.busts.length === 0 && <p className="text-sm text-muted-foreground">Aucun bust.</p>}
          {draft.busts.map((bust, index) => (
            <div key={bust.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2">
              <Select value={bust.eliminatedId} onValueChange={(v) => updateBust(index, { eliminatedId: v })}>
                <SelectTrigger className="w-[12rem] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{playerOptions()}</SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">busté par</span>
              <Select value={bust.killerId || NONE} onValueChange={(v) => updateBust(index, { killerId: v === NONE ? '' : v })}>
                <SelectTrigger className="w-[12rem] h-9"><SelectValue placeholder="Killer…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} disabled>Killer…</SelectItem>
                  {playerOptions(bust.eliminatedId)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1 text-sm text-muted-foreground">
                Niv.
                <Input type="number" min={1} className="w-16 h-9" value={bust.level} onChange={(e) => updateBust(index, { level: parseInt(e.target.value, 10) || 0 })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={bust.recaveApplied} onCheckedChange={(c) => updateBust(index, { recaveApplied: c === true })} />
                Recave
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 ml-auto text-destructive"
                onClick={() => setDraft((d) => d && { ...d, busts: d.busts.filter((_, i) => i !== index) })}
                title="Supprimer le bust"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">La case « Recave » est informative : le malus dépend du nombre de recaves ci-dessous.</p>
        </div>
      </SectionCard>

      {/* --- Recaves --- */}
      <SectionCard title="Recaves" description="Nombre de recaves complètes et recave light (compte pour ½ dans le malus).">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const r = draft.rebuys.find((x) => x.playerId === p.playerId);
            if (!r) return null;
            return (
              <div key={p.playerId} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
                <span className="flex-1 text-sm font-medium truncate">{p.firstName} {p.lastName}</span>
                <Input type="number" min={0} className="w-16 h-9" value={r.rebuysCount} onChange={(e) => updateRebuy(p.playerId, { rebuysCount: parseInt(e.target.value, 10) || 0 })} />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Checkbox checked={r.lightRebuyUsed} onCheckedChange={(c) => updateRebuy(p.playerId, { lightRebuyUsed: c === true })} />
                  light
                </label>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* --- Barre d'actions --- */}
      <div className="sticky bottom-0 z-30 rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 text-sm min-w-[12rem]">
            {errors.length > 0 ? (
              <span className="text-destructive">{errors[0]}{errors.length > 1 ? ` (+${errors.length - 1})` : ''}</span>
            ) : isDirty ? (
              <span>Modifications non enregistrées</span>
            ) : (
              <span className="text-muted-foreground">Aucune modification{data.drift.length > 0 ? ' (recalcul possible)' : ''}</span>
            )}
          </div>
          <Button variant="outline" onClick={reset} disabled={!isDirty || isBusy}>
            <RotateCcw className="h-4 w-4 mr-1" />Annuler
          </Button>
          <Button onClick={openPreview} disabled={errors.length > 0 || isBusy || (!isDirty && data.drift.length === 0)}>
            Aperçu des changements
          </Button>
        </div>
      </div>

      {/* --- Historique --- */}
      <SectionCard title="Historique des corrections" icon={<History className="h-4 w-4" />}>
        <div className="space-y-3">
          {data.history.length === 0 && <p className="text-sm text-muted-foreground">Aucune correction pour ce tournoi.</p>}
          {data.history.map((h) => (
            <div key={h.id} className="text-sm border-l-2 border-border pl-3">
              <div className="text-muted-foreground">
                {new Date(h.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} — {h.authorName}
              </div>
              <ul className="list-disc pl-4">{h.summary.split('\n').map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vérifier la correction</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              {preview.summary.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">Saisie modifiée</h4>
                  <ul className="list-disc pl-5">{preview.summary.map((l, i) => <li key={i}>{l}</li>)}</ul>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-1">Effet sur les joueurs ({preview.diff.length})</h4>
                {preview.diff.length === 0 ? <p className="text-muted-foreground">Aucun changement de points.</p> : <DiffTable diff={preview.diff} nameOf={nameOf} />}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={isBusy}>Retour</Button>
            <Button onClick={apply} disabled={isBusy}>Valider la correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffTable({ diff, nameOf }: { diff: PlayerDiff[]; nameOf: (id: string) => string }) {
  return (
    <div className="space-y-2">
      {diff.map((d) => {
        const total = d.changes.find((c) => c.field === 'totalPoints');
        return (
          <div key={d.playerId} className="rounded-md border border-border/60 p-2">
            <div className="flex justify-between font-medium">
              <span>{nameOf(d.playerId)}</span>
              {total && (
                <span>
                  {String(total.before)} → {String(total.after)}{' '}
                  <span className={Number(total.after) - Number(total.before) >= 0 ? 'text-green-600' : 'text-destructive'}>
                    ({Number(total.after) - Number(total.before) >= 0 ? '+' : ''}{Number(total.after) - Number(total.before)})
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {d.changes
                .filter((c) => c.field !== 'totalPoints')
                .map((c) => (
                  <span key={c.field}>
                    {FIELD_LABELS[c.field]} : {formatValue(c.field, c.before)} → {formatValue(c.field, c.after)}
                  </span>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
