import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@contexts/ThemeContext';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider. Wrap your app with <ThemeProvider> in main.tsx.');
  }
  return context;
}
