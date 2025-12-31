'use client';

import { use } from 'react';
import { TvV3Page } from '@/features/tv/TvV3Page';

/**
 * TV View v3 - Direct access to v3 implementation
 *
 * This is the same as the canonical /tv route.
 * Prefer using /tv/[tournamentId] for the canonical URL.
 *
 * @see docs/TV_CANONICAL.md for more information
 */
export default function TVSpectatorViewV3({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  return <TvV3Page tournamentId={tournamentId} />;
}
