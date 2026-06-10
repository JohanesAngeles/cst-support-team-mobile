import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cst_theme';

// ─── Color palettes ───────────────────────────────────────────────────────────
// Primary brand: #021B3A (navy)   Muted/gray: #757575   Accent: #2C6EBD (gold)

export const LightTheme = {
  dark: false,
  background:   '#FAFBFF',
  surface:      '#F5F7FA',
  surfaceLight: '#EBEEF2',
  primary:      '#021B3A',
  secondary:    '#2C6EBD',
  danger:       '#CC0000',
  success:      '#27AE60',
  text:         '#021B3A',
  textMuted:    '#757575',
  textDark:     '#021B3A',
  border:       '#D9DCE0',
  inputBg:      '#F5F7FA',
  white:        '#FFFFFF',
  black:        '#000000',
  cardShadow:   'rgba(2,27,58,0.08)',
  // Gradient palette — matches the landing site's ambient blob colors
  orange:       '#F97316',
  indigo:       '#6366F1',
  violet:       '#8B5CF6',
};

export const DarkTheme = {
  dark: true,
  background:   '#021B3A',
  surface:      '#0A2447',
  surfaceLight: '#0F2D57',
  primary:      '#021B3A',
  secondary:    '#2C6EBD',
  danger:       '#CC0000',
  success:      '#2ECC71',
  text:         '#FFFFFF',
  textMuted:    '#757575',
  textDark:     '#021B3A',
  border:       '#1A3560',
  inputBg:      '#0A2447',
  white:        '#FFFFFF',
  black:        '#000000',
  cardShadow:   'rgba(0,0,0,0.4)',
  // Same gradient palette in dark mode
  orange:       '#F97316',
  indigo:       '#6366F1',
  violet:       '#8B5CF6',
};

export type Theme = typeof LightTheme;
export type ColorMode = 'light' | 'dark' | 'system';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextType {
  theme:    Theme;
  mode:     ColorMode;
  isDark:   boolean;
  setMode:  (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme:   LightTheme,
  mode:    'light',
  isDark:  false,
  setMode: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Default is always LIGHT — only changes if user explicitly picks dark/system
  const [mode, setModeState] = useState<ColorMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = async (m: ColorMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme === 'dark');

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DarkTheme : LightTheme, mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useTheme  = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).theme;

