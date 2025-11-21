'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialiser avec localStorage ou dark par défaut
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme as Theme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    // Appliquer le thème initial
    applyTheme(theme);

    // Charger le thème depuis les paramètres serveur (optionnel, pour synchronisation)
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data?.theme && data.theme !== theme) {
          setThemeState(data.theme);
          applyTheme(data.theme);
          localStorage.setItem('theme', data.theme);
        }
      })
      .catch(() => {
        // En cas d'erreur, garder le thème actuel
      });
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  // Pendant le SSR ou si le provider n'est pas encore monté,
  // retourner des valeurs par défaut au lieu de lancer une erreur
  if (context === undefined) {
    // Valeurs par défaut pour le SSR
    return {
      theme: 'dark' as Theme,
      setTheme: () => {}, // fonction no-op
    };
  }

  return context;
}
