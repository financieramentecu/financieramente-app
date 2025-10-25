import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default (async () => {
  const react = (await import('@vitejs/plugin-react')).default;
  return defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(dirname, './src'),
      },
    },
  });
})();
