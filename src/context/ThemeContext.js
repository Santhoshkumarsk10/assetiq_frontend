'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  MINIMAL: 'minimal',
  AUXINZIO: 'auxinzio',
};

export const availableThemes = [
  {
    id: THEMES.MINIMAL,
    name: 'Minimal',
    description: 'Clean & standard emerald theme',
    color: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: THEMES.AUXINZIO,
    name: 'Auxinzio',
    description: 'Vibrant modern gradient theme',
    color: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(THEMES.MINIMAL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('assetiq_theme');
      if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem('assetiq_theme', newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage', e);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === THEMES.AUXINZIO) {
        document.documentElement.classList.add('theme-auxinzio');
        document.documentElement.classList.remove('theme-minimal');
      } else {
        document.documentElement.classList.add('theme-minimal');
        document.documentElement.classList.remove('theme-auxinzio');
      }
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    isAuxinzio: theme === THEMES.AUXINZIO,
    isMinimal: theme === THEMES.MINIMAL,
    availableThemes,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
