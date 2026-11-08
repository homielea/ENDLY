import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 100000, cssCodeSplit: false },
  test: { environment: 'jsdom', globals: true, include: ['tests/**/*.test.ts'] },
});
