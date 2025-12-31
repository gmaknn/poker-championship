# TV Spectator Views - Canonical Routing

## Overview

The TV spectator view allows displaying tournament information on a large screen during poker tournaments. This includes blinds, timer, player count, rankings, and more.

## Canonical Version

**The canonical TV view is v3** (`/tv/[tournamentId]`).

v3 was chosen as the canonical version because it includes all features from previous versions plus:

- Audio TTS announcements (blind changes, breaks, etc.)
- Confetti animations for podium
- Multiple visual themes (dark, green, blue, casino)
- Podium photo generator
- Circular timer component
- Top sharks and rebuyers display
- Enhanced visual effects

## Route Structure

| Route | Version | Status |
|-------|---------|--------|
| `/tv/[tournamentId]` | v3 | **Canonical** (recommended) |
| `/tv-v3/[tournamentId]` | v3 | Direct access to v3 |
| `/tv-v2/[tournamentId]` | v2 | Legacy - will be deprecated |
| `/tv-legacy/[tournamentId]` | v1 | Legacy - will be deprecated |

## Architecture

### Shared Component

The v3 implementation is extracted into a shared module:

```
src/features/tv/TvV3Page.tsx
```

Both `/tv` and `/tv-v3` routes import this shared component:

```typescript
// src/app/tv/[tournamentId]/page.tsx
import { TvV3Page } from '@/features/tv/TvV3Page';

export default function TVCanonicalPage({ params }) {
  const { tournamentId } = use(params);
  return <TvV3Page tournamentId={tournamentId} />;
}
```

This pattern:
- Avoids cross-route re-exports (which can be fragile)
- Ensures both routes use the exact same implementation
- Makes maintenance easier with a single source of truth

## Legacy Banner

Legacy versions (v1 via `/tv-legacy`, v2 via `/tv-v2`) display a warning banner at the top of the page informing users that:
- They are viewing a legacy version
- The version will be deprecated soon
- A link to the canonical version is provided

The banner is implemented via the `LegacyBanner` component (`src/components/LegacyBanner.tsx`).

## Version Comparison

### v1 (Basic) - `/tv-legacy`
- Basic timer display
- Blind level info
- Player count
- Simple ranking display

### v2 (Enhanced Timer) - `/tv-v2`
- All v1 features
- Server-synchronized timer
- Pause/resume functionality
- Keyboard controls (Space bar)

### v3 (Full Featured) - `/tv` (CANONICAL)
- All v2 features
- Audio TTS announcements
- Confetti animations
- Theme selector (dark, green, blue, casino)
- Podium photo generator
- Circular timer visualization
- Top sharks/rebuyers sidebar
- Enhanced UI/UX

## Deprecation Timeline

Legacy versions (v1, v2) will remain accessible for backwards compatibility but are marked for future deprecation. Users should migrate to the canonical `/tv/[tournamentId]` route.

## Usage

For tournament spectator display, always use:

```
/tv/{tournamentId}
```

Example: `/tv/abc123-def456-789`
