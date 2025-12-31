/**
 * Canonical TV View - Routes to v3 (the most complete version)
 *
 * This is the official TV spectator view for tournaments.
 * Legacy versions (v1, v2) are still accessible at /tv-v2 and /tv-v3 but will be deprecated.
 *
 * @see docs/TV_CANONICAL.md for more information
 */

// Re-export the canonical TV view (v3)
export { default } from '@/app/tv-v3/[tournamentId]/page';
