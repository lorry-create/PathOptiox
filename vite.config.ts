import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@components': path.resolve(__dirname, './src/components'),
          '@features': path.resolve(__dirname, './src/components/features'),
          '@ui': path.resolve(__dirname, './src/components/ui'),
          '@layout': path.resolve(__dirname, './src/components/layout'),
          '@services': path.resolve(__dirname, './src/services'),
          '@hooks': path.resolve(__dirname, './src/hooks'),
          '@contexts': path.resolve(__dirname, './src/contexts'),
          '@stores': path.resolve(__dirname, './src/stores'),
          '@types': path.resolve(__dirname, './src/types'),
          '@utils': path.resolve(__dirname, './src/utils'),
          '@assets': path.resolve(__dirname, './src/assets'),
        }
      }
    };
});
