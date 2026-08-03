import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@rrn_theme';

// ─── Color palettes ───────────────────────────────────────────────────────────
// Primary brand: #021B3A (darkest navy)   Muted/gray: #8FA0B3   Accent: #C8D2DC (silver)
// Dark is the app's default look — LightTheme exists only as an opt-out via Settings.

export const LightTheme = {
  dark: false,
  background:   'transparent',
  backgroundSolid: '#FAFBFF',
  surface:      '#F5F7FA',
  surfaceLight: '#EBEEF2',
  primary:      '#021B3A',
  secondary:    '#5B7A99',
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
  silver:       '#8FA0B3',
  // Gradient palette — matches the landing site's ambient blob colors
  orange:       '#F97316',
  indigo:       '#6366F1',
  violet:       '#8B5CF6',
};

export const DarkTheme = {
  dark: true,
  background:   'transparent',
  backgroundSolid: '#050B18',
  surface:      '#0A1B33',
  surfaceLight: '#102A4C',
  primary:      '#021B3A',
  secondary:    '#C8D2DC',
  danger:       '#FF453A',
  success:      '#2ECC71',
  text:         '#FFFFFF',
  textMuted:    '#8FA0B3',
  textDark:     '#021B3A',
  border:       '#1E3A5C',
  inputBg:      '#0A1B33',
  white:        '#FFFFFF',
  black:        '#000000',
  cardShadow:   'rgba(0,0,0,0.5)',
  silver:       '#C8D2DC',
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
  theme:   DarkTheme,
  mode:    'dark',
  isDark:  true,
  setMode: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Default is always DARK — only changes if user explicitly picks light/system
  const [mode, setModeState] = useState<ColorMode>('dark');

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
