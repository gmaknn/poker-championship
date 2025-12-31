'use client';

import { use } from 'react';
import { TvV3Page } from '@/features/tv/TvV3Page';

/**
 * Canonical TV View - Routes to v3 (the most complete version)
 *
 * This is the official TV spectator view for tournaments.
 * Legacy versions are still accessible at /tv-v2, /tv-v3 and /tv-legacy.
 *
 * @see docs/TV_CANONICAL.md for more information
 */
export default function TVCanonicalPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  return <TvV3Page tournamentId={tournamentId} />;
}
