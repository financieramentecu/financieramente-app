/**
 * Layering guard (architecture rule: route handlers never call Prisma).
 * Static assertions over the sub-route sources that were audited in Phase 9.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROUTES_DIR = path.resolve(__dirname, '..')
const read = (relative: string) =>
	readFileSync(path.join(ROUTES_DIR, relative), 'utf8')

/** Routes whose only Prisma usage was the access-user lookup. */
const PRISMA_FREE_ROUTES = [
	'comments/route.ts',
	'comprobantes/route.ts',
	'comprobantes/presign/route.ts',
	'comprobantes/[supportId]/route.ts',
]

/** Every route that maps an access denial must go through the one mapper. */
const DENIAL_MAPPING_ROUTES = [
	...PRISMA_FREE_ROUTES,
	'route.ts',
	'payments/route.ts',
	'annual-payments/route.ts',
	'mark-novedad/route.ts',
]

describe('negocios/[id] sub-routes layering', () => {
	it.each(PRISMA_FREE_ROUTES)(
		'%s does not import the Prisma client',
		(file) => {
			expect(read(file)).not.toMatch(/from\s+['"]@\/lib\/prisma['"]/)
		}
	)

	it.each(PRISMA_FREE_ROUTES)(
		'%s no longer loads the access user with prisma.user.findUnique',
		(file) => {
			expect(read(file)).not.toContain('prisma.user.findUnique')
		}
	)

	it.each(DENIAL_MAPPING_ROUTES)(
		'%s maps access denials through businessAccessDeniedResponse',
		(file) => {
			const source = read(file)
			expect(source).toContain('businessAccessDeniedResponse')
			expect(source).not.toMatch(/(access|denied)\.status/)
			expect(source).not.toMatch(/(access|denied)\.error/)
		}
	)
})
