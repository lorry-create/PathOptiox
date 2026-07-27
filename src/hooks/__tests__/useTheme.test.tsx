import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTheme } from '../useTheme';
import { ThemeProvider } from '../../contexts/ThemeContext';

function TestComponent() {
  const { theme, isDark, isLight, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <span data-testid="isLight">{String(isLight)}</span>
      <button data-testid="toggle" onClick={toggleTheme}>toggle</button>
      <button data-testid="setLight" onClick={() => setTheme('light')}>setLight</button>
    </div>
  );
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return current theme context values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('isDark').textContent).toBe('true');
    expect(screen.getByTestId('isLight').textContent).toBe('false');
  });
});
