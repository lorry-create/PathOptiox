/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          elevated: 'var(--color-bg-elevated)',
          modal: 'var(--color-bg-modal)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        brand: {
          primary: 'var(--color-brand-primary)',
          success: 'var(--color-brand-success)',
          warning: 'var(--color-brand-warning)',
          error: 'var(--color-brand-error)',
          accent: 'var(--color-brand-accent)',
        },
        border: {
          default: 'var(--color-border-default)',
          input: 'var(--color-border-input)',
          focus: 'var(--color-border-focus)',
        },
      },
    },
  },
  plugins: [],
};
