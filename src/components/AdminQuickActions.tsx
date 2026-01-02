'use client';

import { useState } from 'react';
import { Play, Square, Pause, RotateCcw, Flag, Users, Table, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminDashboardResponse } from '@/types/admin-dashboard';

interface AdminQuickActionsProps {
  tournamentId: string;
  data: AdminDashboardResponse;
  onActionComplete: () => void;
}

type ActionType = 'start' | 'finish' | 'pause' | 'resume' | 'reset';

export default function AdminQuickActions({
  tournamentId,
  data,
  onActionComplete,
}: AdminQuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { tournament, level } = data;

  // Button enabled/disabled rules based on spec
  const canStart = tournament.status === 'PLANNED';
  const canFinish = tournament.status === 'IN_PROGRESS';
  const canPause = tournament.status === 'IN_PROGRESS' && level.isRunning && !level.isPaused;
  const canResume = tournament.status === 'IN_PROGRESS' && level.isRunning && level.isPaused;
  const canReset = tournament.status === 'IN_PROGRESS';

  const executeAction = async (action: ActionType) => {
    setLoadingAction(action);
    setError(null);

    try {
      let response: Response;

      switch (action) {
        case 'start':
          response = await fetch(`/api/tournaments/${tournamentId}/timer/start`, {
            method: 'POST',
          });
          break;
        case 'pause':
          response = await fetch(`/api/tournaments/${tournamentId}/timer/pause`, {
            method: 'POST',
          });
          break;
        case 'resume':
          response = await fetch(`/api/tournaments/${tournamentId}/timer/resume`, {
            method: 'POST',
          });
          break;
        case 'reset':
          response = await fetch(`/api/tournaments/${tournamentId}/timer/reset`, {
            method: 'POST',
          });
          break;
        case 'finish':
          response = await fetch(`/api/tournaments/${tournamentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'FINISHED' }),
          });
          break;
        default:
          throw new Error('Unknown action');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Action failed (${response.status})`);
      }

      // Success - trigger refetch
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Timer Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => executeAction('start')}
            disabled={!canStart || loadingAction !== null}
            className="w-full"
            variant={canStart ? 'default' : 'outline'}
          >
            <Play className="mr-2 h-4 w-4" />
            {loadingAction === 'start' ? 'Demarrage...' : 'Start'}
          </Button>

          <Button
            onClick={() => executeAction('finish')}
            disabled={!canFinish || loadingAction !== null}
            className="w-full"
            variant={canFinish ? 'default' : 'outline'}
          >
            <Flag className="mr-2 h-4 w-4" />
            {loadingAction === 'finish' ? 'Finalisation...' : 'Finish'}
          </Button>

          <Button
            onClick={() => executeAction('pause')}
            disabled={!canPause || loadingAction !== null}
            className="w-full"
            variant="outline"
          >
            <Pause className="mr-2 h-4 w-4" />
            {loadingAction === 'pause' ? 'Pause...' : 'Pause'}
          </Button>

          <Button
            onClick={() => executeAction('resume')}
            disabled={!canResume || loadingAction !== null}
            className="w-full"
            variant="outline"
          >
            <Play className="mr-2 h-4 w-4" />
            {loadingAction === 'resume' ? 'Reprise...' : 'Resume'}
          </Button>

          <Button
            onClick={() => executeAction('reset')}
            disabled={!canReset || loadingAction !== null}
            className="w-full col-span-2"
            variant="destructive"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {loadingAction === 'reset' ? 'Reset...' : 'Reset Timer'}
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Liens rapides</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                const tabsElement = document.querySelector('[data-admin-tab="results"]');
                if (tabsElement) {
                  (tabsElement as HTMLElement).click();
                }
              }}
            >
              <Trophy className="mr-1 h-4 w-4" />
              Leaderboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                const tabsElement = document.querySelector('[data-admin-tab="tables"]');
                if (tabsElement) {
                  (tabsElement as HTMLElement).click();
                }
              }}
            >
              <Table className="mr-1 h-4 w-4" />
              Tables
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                const tabsElement = document.querySelector('[data-admin-tab="players"]');
                if (tabsElement) {
                  (tabsElement as HTMLElement).click();
                }
              }}
            >
              <Users className="mr-1 h-4 w-4" />
              Players
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
