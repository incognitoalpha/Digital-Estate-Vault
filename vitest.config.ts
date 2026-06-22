import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Only run unit tests — integration tests need a live server,
    // and e2e tests are run separately via Playwright.
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      'tests/integration/**',
      'node_modules/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
