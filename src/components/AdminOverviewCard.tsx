'use client';

import { Users, Clock, Coins, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminDashboardResponse } from '@/types/admin-dashboard';

interface AdminOverviewCardProps {
  data: AdminDashboardResponse;
}

const STATUS_CONFIG = {
  PLANNED: { label: 'Planifie', className: 'bg-gray-500 text-white' },
  IN_PROGRESS: { label: 'En cours', className: 'bg-green-600 text-white' },
  FINISHED: { label: 'Termine', className: 'bg-blue-600 text-white' },
} as const;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatBlinds(blinds: { smallBlind: number; bigBlind: number; ante: number }): string {
  const base = `${blinds.smallBlind}/${blinds.bigBlind}`;
  return blinds.ante > 0 ? `${base} (ante ${blinds.ante})` : base;
}

export default function AdminOverviewCard({ data }: AdminOverviewCardProps) {
  const statusConfig = STATUS_CONFIG[data.tournament.status];

  const alerts = [];
  if (data.alerts.rebuyWindowClosed) {
    alerts.push({ label: 'Rebuy window closed', variant: 'outline' as const });
  }
  if (data.alerts.noPlayersRemaining) {
    alerts.push({ label: 'No players remaining', variant: 'destructive' as const });
  }
  if (data.alerts.finishedLeaderboardInconsistent) {
    alerts.push({ label: 'Leaderboard inconsistent', variant: 'destructive' as const });
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Admin Overview</CardTitle>
          <Badge className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Players Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Inscrits:</span>
              <span className="ml-1 font-semibold">{data.players.registered}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Elimines:</span>
              <span className="ml-1 font-semibold">{data.players.eliminated}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Restants:</span>
              <span className="ml-1 font-semibold text-green-600">{data.players.remaining}</span>
            </div>
          </div>
        </div>

        {/* Level Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span>
                <span className="text-muted-foreground">Level</span>
                <span className="ml-1 font-bold text-lg">{data.level.currentLevel}</span>
              </span>
              <span className="font-mono text-lg font-bold">
                {formatTime(data.level.remainingSeconds)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Blinds: <span className="font-semibold text-foreground">{formatBlinds(data.level.blinds)}</span>
              {data.level.isPaused && (
                <Badge variant="outline" className="ml-2 text-xs">PAUSE</Badge>
              )}
              {!data.level.isRunning && !data.level.isPaused && data.tournament.status !== 'FINISHED' && (
                <Badge variant="outline" className="ml-2 text-xs">ARRETE</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Rebuys Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Rebuys total:</span>
              <span className="ml-1 font-semibold">{data.rebuys.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Light used:</span>
              <span className="ml-1 font-semibold">{data.rebuys.lightUsed}</span>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="flex items-start gap-3 pt-2 border-t border-border">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {alerts.map((alert, index) => (
                <Badge key={index} variant={alert.variant} className="text-xs">
                  {alert.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
