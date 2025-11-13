# Dashboard Header Patterns Analysis

## Overview
Analysis of header structures across 8 dashboard pages to identify patterns, inconsistencies, and opportunities for a unified PageHeader component.

---

## Pattern Examples Found

### 1. Dashboard Home - BASIC PATTERN
**File:** src/app/dashboard/page.tsx (lines 169-186)

**Structure:**
- Simple flex layout: `flex items-center justify-between`
- h1: `text-3xl font-bold`
- Subtitle: `text-muted-foreground`
- Single action button (conditional, size="lg")
- No background styling
- Plain div wrapper

**Code:**
```
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">Dashboard</h1>
    <p className="text-muted-foreground">Vue d'ensemble du championnat</p>
  </div>
  {canCreateTournament && (
    <Button size="lg"><Plus /> Nouveau tournoi</Button>
  )}
</div>
```

---

### 2. Tournaments Page - GRADIENT WITH BORDER PATTERN
**File:** src/app/dashboard/tournaments/page.tsx (lines 341-348)

**Structure:**
- Gradient background: `bg-gradient-to-r from-primary/10 to-primary/5`
- Rounded with border: `rounded-lg p-6 border-2 border-border`
- h1: `text-4xl font-bold`
- Subtitle: `text-muted-foreground mt-1 text-base`
- Complex right section: ToggleGroup + Button in Dialog
- Uses Card elsewhere in page

**Code:**
```
<div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border-2 border-border">
  <div>
    <h1 className="text-4xl font-bold">Tournois</h1>
    <p className="text-muted-foreground mt-1 text-base">Gérez les tournois de poker</p>
  </div>
  <div className="flex items-center gap-3">
    <ToggleGroup>...</ToggleGroup>
    <Button>Nouveau tournoi</Button>
  </div>
</div>
```

---

### 3. Players Page - GRADIENT WITH BORDER (Same Pattern)
**File:** src/app/dashboard/players/page.tsx (lines 236-259)

**Characteristics:**
- Identical to Tournaments pattern
- h1: `text-4xl font-bold`
- Multiple controls: ToggleGroup + conditional Button
- Gradient styling: `bg-gradient-to-r from-primary/10 to-primary/5`

---

### 4. Statistics Page - SIMPLE PATTERN
**File:** src/app/dashboard/statistics/page.tsx (lines 79-84)

**Characteristics:**
- Minimal styling (no background, border, gradient)
- h1: `text-3xl font-bold`
- Plain subtitle with `text-muted-foreground`
- No action buttons
- Inconsistent with other data pages

---

### 5. Settings Page - FLEX WITH STATUS MESSAGE
**File:** src/app/dashboard/settings/page.tsx (lines 112-125)

**Characteristics:**
- Simple flex: `flex items-center justify-between`
- h1: `text-3xl font-bold`
- Right section: conditional success status message (not button)
- Status styling: `text-green-600 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-lg`
- No header background

---

### 6. Seasons Page - GRADIENT WITH BORDER
**File:** src/app/dashboard/seasons/page.tsx (lines 212-223)

**Characteristics:**
- Gradient background: `bg-gradient-to-r from-primary/10 to-primary/5`
- Border and padding: `rounded-lg p-6 border-2 border-border`
- h1: `text-4xl font-bold`
- Subtitle: `text-muted-foreground mt-1 text-base`
- Single action button: `size="lg"`

---

### 7. Main Leaderboard - MUTED BACKGROUND
**File:** src/app/dashboard/leaderboard/page.tsx (lines 128-167)

**Characteristics:**
- Different background: `bg-muted/30` (not gradient)
- Border: `rounded-lg p-6 border-2 border-border`
- h1: `text-3xl font-bold`
- Subtitle with Badge: dynamic content in subtitle
- Right section: Calendar icon + Select dropdown (not button)

---

### 8. Season Leaderboard - ARROW + STYLED
**File:** src/app/dashboard/seasons/[id]/leaderboard/page.tsx (lines 188-215)

**Characteristics:**
- Gradient background: `bg-gradient-to-r from-primary/10 to-primary/5`
- Back button on left: `Button variant="ghost" size="icon"`
- h1: `text-4xl font-bold`
- Multi-line subtitle with dynamic badges and conditions
- Two action buttons: back button + export button
- Left section is flexed with gap-4

---

## Identified Inconsistencies

| Aspect | Variations | Pages |
|--------|-----------|-------|
| **Title Size** | text-3xl vs text-4xl | Dashboard(3xl), Tournaments(4xl), Players(4xl), Statistics(3xl), Settings(3xl), Seasons(4xl), Leaderboard(3xl), Season Leaderboard(4xl) |
| **Background** | None, gradient, muted/30 | Dashboard(none), Tournaments(gradient), Players(gradient), Statistics(none), Settings(none), Seasons(gradient), Leaderboard(muted), Season Leaderboard(gradient) |
| **Subtitle Spacing** | mt-1, mt-0 implicit | Mostly mt-1 text-base, some implicit |
| **Styled Container** | border-2 border-border p-6 vs plain div | Half styled, half plain |
| **Layout Wrapper** | space-y-6, space-y-8, or none | Outer page container varies |
| **Right Section** | Buttons, toggles, selects, status messages | No standard pattern |
| **Back Navigation** | Only Season Leaderboard has it | Unique implementation pattern |
| **Action Buttons** | size="lg" vs default | Inconsistent sizing |

---

## Common Elements Summary

### Always Present:
- h1 heading with font-bold
- subtitle/description text
- flex layout for positioning

### Frequently Present:
- border-2 border-border (5/8 pages)
- p-6 padding (5/8 pages)
- rounded-lg (5/8 pages)
- Right-aligned action area (7/8 pages)

### Background Variants:
1. No background (3 pages): Dashboard, Statistics, Settings
2. Gradient background (4 pages): Tournaments, Players, Seasons, Season Leaderboard
3. Muted background (1 page): Leaderboard

### Title Size Distribution:
- text-3xl: 4 pages (Dashboard, Statistics, Settings, Leaderboard)
- text-4xl: 4 pages (Tournaments, Players, Seasons, Season Leaderboard)

---

## Code Duplication Metrics

Each header is approximately 15-20 lines of JSX:
- 8 dashboard pages with headers
- Duplicated pattern: flex, h1, p, button logic
- Estimated total duplicate code: 120-160 lines across application

---

## Recommended Component Structure

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  backButton?: {
    onClick: () => void;
  };
  variant?: 'gradient' | 'muted' | 'none';
  titleSize?: 'sm' | 'lg';
}
```

### Variants:
- **gradient**: `bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-border rounded-lg p-6`
- **muted**: `bg-muted/30 border-2 border-border rounded-lg p-6`
- **none**: plain div

### Title Sizes:
- **sm**: text-3xl (default)
- **lg**: text-4xl

---

## Migration Priority

HIGH PRIORITY (High Impact):
1. Tournaments (lines 341-348)
2. Players (lines 236-259)
3. Seasons (lines 212-223)

MEDIUM PRIORITY (Complex Cases):
4. Season Leaderboard (has back button)
5. Leaderboard (custom select dropdown)

LOW PRIORITY (Simple/Edge Cases):
6. Dashboard (no styling)
7. Settings (status message instead of button)
8. Statistics (minimal styling)

---

## Summary Statistics

- Total header patterns identified: 8
- Distinct style variations: 3 (gradient, muted, none)
- Title size variants: 2 (text-3xl, text-4xl)
- Pages with gradient background: 4
- Pages with border styling: 6
- Pages with padding p-6: 5
- Estimated code reduction: 70-80% with component

