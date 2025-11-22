import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, themes, defaultTheme, ThemeId, themeVariables } from '@/utils/themes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'thanos_theme';

/**
 * Get saved theme from localStorage
 */
function getSavedTheme(): Theme {
  try {
    const savedId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedId) {
      const savedTheme = themes.find(t => t.id === savedId);
      if (savedTheme) {
        return savedTheme;
      }
    }
  } catch (error) {
    console.warn('Failed to read theme from storage:', error);
  }
  return defaultTheme;
}

/**
 * Save theme to localStorage
 */
function saveTheme(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

/**
 * Apply theme CSS variables to the document root
 */
function applyTheme(themeId: string): void {
  const root = document.documentElement;

  // Remove all theme classes
  themes.forEach(theme => {
    root.classList.remove(theme.cssClass);
  });

  // Add the selected theme class
  const selectedTheme = themes.find(t => t.id === themeId);
  if (selectedTheme) {
    root.classList.add(selectedTheme.cssClass);
  }

  // Apply CSS variables
  const variables = themeVariables[themeId as ThemeId];
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(getSavedTheme);

  useEffect(() => {
    // Apply theme on mount and when it changes
    applyTheme(currentTheme.id);
  }, [currentTheme]);

  const handleSetTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      saveTheme(themeId);
      applyTheme(themeId);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    setTheme: handleSetTheme,
    availableThemes: themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
