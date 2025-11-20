export type TVTheme = {
  id: string;
  name: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    backgroundDark: string;
    backgroundLight: string;
    border: string;
    text: string;
    textMuted: string;
  };
};

export const TV_THEMES: TVTheme[] = [
  {
    id: 'default',
    name: 'Vert Classique',
    colors: {
      primary: 'hsl(142, 71%, 45%)',       // Green
      primaryDark: 'hsl(142, 71%, 35%)',
      primaryLight: 'hsl(142, 71%, 55%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'blue',
    name: 'Bleu Royal',
    colors: {
      primary: 'hsl(217, 91%, 60%)',       // Blue
      primaryDark: 'hsl(217, 91%, 50%)',
      primaryLight: 'hsl(217, 91%, 70%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'red',
    name: 'Rouge Passion',
    colors: {
      primary: 'hsl(0, 84%, 60%)',         // Red
      primaryDark: 'hsl(0, 84%, 50%)',
      primaryLight: 'hsl(0, 84%, 70%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'purple',
    name: 'Violet Royal',
    colors: {
      primary: 'hsl(271, 81%, 56%)',       // Purple
      primaryDark: 'hsl(271, 81%, 46%)',
      primaryLight: 'hsl(271, 81%, 66%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'gold',
    name: 'Or Luxe',
    colors: {
      primary: 'hsl(45, 100%, 51%)',       // Gold
      primaryDark: 'hsl(45, 100%, 41%)',
      primaryLight: 'hsl(45, 100%, 61%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'teal',
    name: 'Turquoise',
    colors: {
      primary: 'hsl(173, 80%, 40%)',       // Teal
      primaryDark: 'hsl(173, 80%, 30%)',
      primaryLight: 'hsl(173, 80%, 50%)',
      background: 'hsl(220, 18%, 12%)',
      backgroundDark: 'hsl(220, 15%, 18%)',
      backgroundLight: 'hsl(220, 15%, 22%)',
      border: 'hsl(220, 13%, 30%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'dark',
    name: 'Noir Élégant',
    colors: {
      primary: 'hsl(0, 0%, 90%)',          // Light gray as primary
      primaryDark: 'hsl(0, 0%, 80%)',
      primaryLight: 'hsl(0, 0%, 100%)',
      background: 'hsl(0, 0%, 8%)',
      backgroundDark: 'hsl(0, 0%, 12%)',
      backgroundLight: 'hsl(0, 0%, 16%)',
      border: 'hsl(0, 0%, 25%)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    },
  },
];

const STORAGE_KEY = 'tv-theme';

/**
 * Get the saved theme from localStorage or return default
 */
export function getSavedTheme(): TVTheme {
  if (typeof window === 'undefined') {
    return TV_THEMES[0];
  }

  const savedThemeId = localStorage.getItem(STORAGE_KEY);
  const theme = TV_THEMES.find((t) => t.id === savedThemeId);
  return theme || TV_THEMES[0];
}

/**
 * Save the selected theme to localStorage
 */
export function saveTheme(themeId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, themeId);
}

/**
 * Apply theme CSS variables to an element
 */
export function applyThemeToElement(element: HTMLElement, theme: TVTheme): void {
  element.style.setProperty('--tv-primary', theme.colors.primary);
  element.style.setProperty('--tv-primary-dark', theme.colors.primaryDark);
  element.style.setProperty('--tv-primary-light', theme.colors.primaryLight);
  element.style.setProperty('--tv-background', theme.colors.background);
  element.style.setProperty('--tv-background-dark', theme.colors.backgroundDark);
  element.style.setProperty('--tv-background-light', theme.colors.backgroundLight);
  element.style.setProperty('--tv-border', theme.colors.border);
  element.style.setProperty('--tv-text', theme.colors.text);
  element.style.setProperty('--tv-text-muted', theme.colors.textMuted);
}
