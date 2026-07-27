import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, ThemeContext, Theme } from '../ThemeContext';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('should default to dark theme when no localStorage value', () => {
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => <span>{value.theme}</span>}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('should read theme from localStorage on mount', () => {
    localStorageMock.setItem('pathoptix-theme', 'light');
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => <span>{value.theme}</span>}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('should toggle theme between dark and light', async () => {
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => (
            <button onClick={value.toggleTheme}>{value.theme}</button>
          )}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );
    
    const btn = screen.getByRole('button');
    expect(screen.getByText('dark')).toBeInTheDocument();
    
    await act(async () => { btn.click(); });
    expect(screen.getByText('light')).toBeInTheDocument();
    
    await act(async () => { btn.click(); });
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('should persist theme to localStorage on toggle', async () => {
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => (
            <button onClick={value.toggleTheme}>toggle</button>
          )}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );

    const btn = screen.getByText('toggle');
    await act(async () => { btn.click(); });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pathoptix-theme', 'light');
  });

  it('should apply data-theme attribute to html element', async () => {
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => (
            <button onClick={value.toggleTheme}>toggle</button>
          )}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const btn = screen.getByText('toggle');
    await act(async () => { btn.click(); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should provide correct isDark and isLight flags', () => {
    render(
      <ThemeProvider>
        <ThemeContext.Consumer>
          {(value) => (
            <span>{String(value.isDark)}-{String(value.isLight)}</span>
          )}
        </ThemeContext.Consumer>
      </ThemeProvider>
    );
    expect(screen.getByText('true-false')).toBeInTheDocument();
  });
});
