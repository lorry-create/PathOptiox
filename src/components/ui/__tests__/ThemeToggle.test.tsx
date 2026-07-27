import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const renderWithProvider = (props: Record<string, unknown> = {}) => {
  return render(
    <ThemeProvider>
      <ThemeToggle {...props} />
    </ThemeProvider>
  );
};

describe('ThemeToggle', () => {
  it('should render without crashing', () => {
    renderWithProvider();
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should have correct default aria-label (dark mode)', () => {
    renderWithProvider();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label', expect.stringContaining('亮色')
    );
  });

  it('should toggle theme on click', () => {
    renderWithProvider();
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-label', expect.stringContaining('亮色'));

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('暗色'));
  });

  it('should apply size-specific classes for each size variant', () => {
    const { rerender } = renderWithProvider({ size: 'sm' });
    let btn = screen.getByRole('button');
    expect(btn.className).toContain('w-7');
    expect(btn.className).toContain('h-7');

    rerender(
      <ThemeProvider>
        <ThemeToggle size="lg" />
      </ThemeProvider>
    );
    btn = screen.getByRole('button');
    expect(btn.className).toContain('w-11');
    expect(btn.className).toContain('h-11');
  });

  it('should support custom className prop', () => {
    renderWithProvider({ className: 'custom-class' });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('custom-class');
  });

  it('should contain Sun and Moon icons with transition classes', () => {
    renderWithProvider();
    const btn = screen.getByRole('button');
    const svgs = btn.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });
});
