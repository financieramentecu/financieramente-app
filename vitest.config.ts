import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname =
	typeof __dirname !== 'undefined'
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url))

export default (async () => {
	const react = (await import('@vitejs/plugin-react')).default
	return defineConfig({
		plugins: [react()],
		test: {
			environment: 'jsdom',
			setupFiles: './vitest.setup.ts',
			globals: true,
			include: ['src/**/*.test.{ts,tsx}', 'prisma/**/*.test.{ts,tsx}'],
			exclude: [
				'node_modules/',
				'dist/',
				'build/',
				'.next/',
				'e2e/**',
				'playwright-report/',
				'test-results/',
				'coverage/',
			],
		},
		resolve: {
			alias: {
				'@': path.resolve(dirname, './src'),
				'server-only': path.resolve(dirname, './src/__mocks__/server-only.ts'),
			},
		},
		optimizeDeps: {
			exclude: ['next', 'next-auth'],
		},
		ssr: {
			noExternal: ['next-auth'],
		},
	})
})()
