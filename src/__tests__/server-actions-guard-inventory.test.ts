/**
 * SEC-03 [TM]: a PARTNER can invoke a Server Action through any allowed page
 * URL, so every `'use server'` file must carry its own auth/role guard.
 *
 * Static scan: a new Server Action file fails this test until it calls a
 * recognised guard (or is added to the allowlist with a TODO and a reason).
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_ROOT = join(process.cwd(), 'src')

const GUARD_PATTERN =
	/\b(requireWriteAccess|requireRole|requireAuth|requireActionPermission)\s*\(|\bawait\s+auth\s*\(\s*\)/

/** Files knowingly exempt from the guard scan. Empty by design. */
const GUARD_ALLOWLIST: Readonly<Record<string, string>> = {}

/** Expected inventory: the scan must find exactly these files. */
const EXPECTED_SERVER_ACTION_FILES = [
	'src/features/calculadora/actions/calculate-commission.ts',
	'src/features/calculadora/actions/get-product-distribution.ts',
	'src/features/liquidaciones/actions/liquidacion.actions.ts',
	'src/features/negocios/actions/check-business-creation.ts',
	'src/features/negocios/actions/create-business.ts',
	'src/features/negocios/actions/create-client.ts',
	'src/features/negocios/actions/find-product-percentage-commission.ts',
	'src/features/negocios/actions/resolve-existing-client.ts',
	'src/features/negocios/actions/sync-business-policyholder.ts',
	'src/features/negocios/actions/update-client.ts',
]

/** Files that must restrict by role/permission, not only by login. */
const ROLE_RESTRICTED_FILES = [
	'src/features/calculadora/actions/calculate-commission.ts',
	'src/features/calculadora/actions/get-product-distribution.ts',
	'src/features/liquidaciones/actions/liquidacion.actions.ts',
	'src/features/negocios/actions/check-business-creation.ts',
	'src/features/negocios/actions/create-business.ts',
	'src/features/negocios/actions/create-client.ts',
	'src/features/negocios/actions/sync-business-policyholder.ts',
	'src/features/negocios/actions/update-client.ts',
]

function collectSourceFiles(dir: string): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			if (entry === '__tests__' || entry === 'node_modules') continue
			files.push(...collectSourceFiles(full))
		} else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
			files.push(full)
		}
	}
	return files
}

const USE_SERVER_DIRECTIVE = /^\s*['"]use server['"]/m

const serverActionFiles = collectSourceFiles(SRC_ROOT)
	.filter((file) => USE_SERVER_DIRECTIVE.test(readFileSync(file, 'utf8')))
	.map((file) => relative(process.cwd(), file))
	.sort()

describe("'use server' guard inventory", () => {
	it('finds exactly the known Server Action files (new ones need a conscious guard)', () => {
		expect(serverActionFiles).toEqual([...EXPECTED_SERVER_ACTION_FILES].sort())
	})

	it.each(EXPECTED_SERVER_ACTION_FILES)(
		'%s calls an auth/role guard',
		(file) => {
			if (GUARD_ALLOWLIST[file]) return
			const source = readFileSync(join(process.cwd(), file), 'utf8')
			expect(source).toMatch(GUARD_PATTERN)
		}
	)

	it.each(ROLE_RESTRICTED_FILES)(
		'%s restricts by role or permission (a login alone is not enough)',
		(file) => {
			const source = readFileSync(join(process.cwd(), file), 'utf8')
			expect(source).toMatch(
				/requireWriteAccess\s*\(|requireActionPermission\s*\(|requireRole\s*\(|hasPermission\s*\(/
			)
		}
	)

	it('every allowlist entry is documented with a TODO(partner-profile) reason', () => {
		for (const [file, reason] of Object.entries(GUARD_ALLOWLIST)) {
			expect(EXPECTED_SERVER_ACTION_FILES).toContain(file)
			expect(reason).toMatch(/^TODO\(partner-profile\):/)
		}
	})
})
