import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig & {
	viteFinal?: (
		config: Record<string, unknown>
	) => Promise<Record<string, unknown>>
} = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		'@chromatic-com/storybook',
		'@storybook/addon-docs',
		'@storybook/addon-onboarding',
		'@storybook/addon-a11y',
		'@storybook/addon-vitest',
	],
	framework: {
		name: '@storybook/nextjs',
		options: {},
	},
	staticDirs: ['../public'],
	typescript: {
		check: false,
		reactDocgen: 'react-docgen-typescript',
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			propFilter: (prop) =>
				prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
		},
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	webpackFinal: async (config: any) => {
		config.resolve = config.resolve || {}
		config.resolve.alias = {
			...config.resolve.alias,
			// next-auth package itself — prevents resolveAuthSecret() at module init
			'next-auth': require.resolve('./mocks/next-auth.ts'),
			'next-auth/react': require.resolve('./mocks/next-auth-react.tsx'),
			'@/auth': require.resolve('./mocks/auth.ts'),
			// Both the @/ alias and the absolute path to catch whichever webpack sees first
			'@/lib/auth/nextauth': require.resolve('./mocks/nextauth.ts'),
			[path.resolve(__dirname, '../src/lib/auth/nextauth')]: require.resolve('./mocks/nextauth.ts'),
			'@flagsmith/flagsmith/react': require.resolve('./mocks/flagsmith-react.ts'),
		}
		return config
	},
	viteFinal: async (config: Record<string, unknown>) => {
		// Mock modules not available in Storybook/Chromatic
		const viteConfig = config as {
			resolve?: {
				alias?:
					| Array<{ find: string | RegExp; replacement: string }>
					| Record<string, string>
			}
		}
		viteConfig.resolve = viteConfig.resolve || {}
		const existingAlias = viteConfig.resolve.alias ?? {}
		const existingEntries = Array.isArray(existingAlias)
			? existingAlias
			: Object.entries(existingAlias as Record<string, string>).map(
					([find, replacement]) => ({ find, replacement })
				)
		viteConfig.resolve.alias = [
			...existingEntries,
			// next-auth package itself — prevents resolveAuthSecret() at module init
			{ find: 'next-auth', replacement: require.resolve('./mocks/next-auth.ts') },
			{ find: 'next-auth/react', replacement: require.resolve('./mocks/next-auth-react.tsx') },
			{ find: '@/auth', replacement: require.resolve('./mocks/auth.ts') },
			{ find: '@/lib/auth/nextauth', replacement: require.resolve('./mocks/nextauth.ts') },
			// Absolute path alias — catches tsconfig-resolved @/ imports before vite sees them
			{ find: path.resolve(__dirname, '../src/lib/auth/nextauth'), replacement: require.resolve('./mocks/nextauth.ts') },
			// RegExp required for scoped subpath packages (@flagsmith/flagsmith/react)
			{ find: /^@flagsmith\/flagsmith\/react$/, replacement: require.resolve('./mocks/flagsmith-react.ts') },
		]
		return config
	},
}

export default config
