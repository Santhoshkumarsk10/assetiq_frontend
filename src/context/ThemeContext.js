'use client';
import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  AUXINZIO: 'auxinzio',
};

export function ThemeProvider({ children }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', THEMES.AUXINZIO);
      document.documentElement.classList.remove('theme-minimal', 'theme-dark');
      document.documentElement.classList.add('theme-auxinzio');
      try {
        localStorage.setItem('assetiq_theme', THEMES.AUXINZIO);
      } catch (e) {
        // silent
      }
    }
  }, []);

  const value = {
    theme: THEMES.AUXINZIO,
    setTheme: () => {},
    isAuxinzio: true,
    isMinimal: false,
    isDark: false,
    mounted: true,
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
