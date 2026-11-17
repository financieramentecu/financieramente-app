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
			'.agent/**',
			'.claude/**',
			'.specsmd/**',
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
	{
		// S2 of odd/tasks/roles-permissions-management.md: authorization decisions
		// go through the access-control module (permissions), never through role
		// codes. `UserRole.X` is only allowed where a role IDENTITY is structural:
		// authentication, impersonation, the locked ADMIN, the external PARTNER,
		// and a few domain rules listed below. Do not extend this list for
		// access decisions: add or reuse a catalog permission instead.
		files: ['src/**/*.{ts,tsx}'],
		ignores: [
			'src/**/__tests__/**',
			'src/**/*.test.{ts,tsx}',
			'src/**/*.stories.{ts,tsx}',
			'src/features/access-control/**',
			// authentication and session
			'src/features/auth/lib/**',
			'src/lib/auth/**',
			'src/middleware.ts',
			'src/app/page.tsx',
			'src/app/dashboard/page.tsx',
			// partner / users domain (PARTNER and SIN_ROL account rules)
			'src/features/admin/partners/**',
			'src/features/admin/users/**',
			'src/app/api/admin/users/set-password/route.ts',
			// notifications and comments routing by role identity
			'src/features/comments/**',
			'src/features/email/lib/admin-notifications.ts',
			// support-analyst value-change confirmation and per-role UI defaults
			'src/features/negocios/lib/business-value-change.ts',
			'src/features/negocios/lib/default-date-filter.ts',
			'src/app/api/negocios/[[]id]/route.ts',
			'src/features/negocios/hooks/use-agent-permissions.ts',
			'src/app/dashboard/calculadora/page.tsx',
		],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: "MemberExpression[object.name='UserRole']",
					message:
						'Do not branch on role codes. Use a permission from the access-control catalog (can / roleCan / requirePermission). See odd/tasks/roles-permissions-management.md.',
				},
			],
		},
	},
	...storybook.configs['flat/recommended'],
]

export default eslintConfig
