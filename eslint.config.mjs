// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'
import prettier from 'eslint-config-prettier'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname,
})

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	prettier,
	{
		ignores: [
			'node_modules/**',
			'.next/**',
			'out/**',
			'build/**',
			'next-env.d.ts',
			'storybook-static/**',
			'coverage/**',
			'html/**',
			'playwright-report/**',
			'test-results/**',
			'skills/**',
		],
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' },
			],
		},
	},
	...storybook.configs['flat/recommended'],
]

export default eslintConfig
