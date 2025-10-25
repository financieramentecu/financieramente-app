import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
    include: ['src/**/*.integration.test.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', '.next/', 'e2e/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/**/*.stories.{js,ts,jsx,tsx}',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/**/*.spec.{js,ts,jsx,tsx}',
        'src/**/*.integration.test.{ts,tsx}',
        '.storybook/',
        'dist/',
        'build/',
        '.next/',
        'coverage/',
        'html/',
        'playwright-report/',
        'test-results/',
        'vitest-report/',
        // Archivos de configuración
        '*.config.{js,ts,mjs,cjs}',
        '*.config.*.{js,ts,mjs,cjs}',
        'next.config.*',
        'tailwind.config.*',
        'postcss.config.*',
        'eslint.config.*',
        'vitest.*.config.*',
        'playwright.config.*',
        'tsconfig*.json',
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        // Archivos de tipos
        '*.d.ts',
        'next-env.d.ts',
        'vitest.setup.ts',
        // Archivos de Storybook
        '.storybook/**',
        // Archivos de E2E
        'e2e/**',
        // Archivos de scripts
        'scripts/**',
        // Archivos de documentación
        'docs/**',
        'README.md',
        'CHANGELOG.md',
        'LICENSE',
        // Archivos de Docker
        'Dockerfile*',
        'docker-compose*.yml',
        'docker/**',
        // Archivos de Terraform
        'terraform/**',
        // Archivos de GitHub Actions
        '.github/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
});
