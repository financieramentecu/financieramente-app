import { describe, it, expect, vi } from 'vitest'
import {
	createRole,
	updateRole,
	setRolePermissions,
	deactivateRole,
	buildRoleCode,
} from '../services/role-admin.service'
import { RoleServiceError } from '../services/role-errors'

const PERMISSIONS = [
	{ idPermission: 1, code: 'roles.gestionar', supportsScope: false, supportsMinLevel: false },
	{ idPermission: 2, code: 'negocios.ver', supportsScope: true, supportsMinLevel: false },
	{ idPermission: 3, code: 'negocios.exportar', supportsScope: true, supportsMinLevel: true },
	{ idPermission: 4, code: 'aportes.fondear', supportsScope: false, supportsMinLevel: false },
]

function createDb(opts: {
	role?: Record<string, unknown> | null
	byCode?: Record<string, unknown> | null
	current?: unknown[]
	users?: number
} = {}) {
	const db = {
		role: {
			findUnique: vi.fn(({ where }: { where: { idRole?: number; code?: string } }) =>
				Promise.resolve(where.code !== undefined ? (opts.byCode ?? null) : (opts.role ?? null))
			),
			create: vi.fn().mockImplementation(({ data }) =>
				Promise.resolve({ idRole: 9, isSystem: false, active: true, ...data })
			),
			update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ idRole: 5, ...data })),
		},
		permission: { findMany: vi.fn().mockResolvedValue(PERMISSIONS) },
		level: {
			findMany: vi.fn().mockResolvedValue([
				{ idLevel: 3, code: 'LEVEL_2' },
				{ idLevel: 4, code: 'LEVEL_3' },
			]),
		},
		rolePermission: {
			findMany: vi.fn().mockResolvedValue(opts.current ?? []),
			upsert: vi.fn().mockResolvedValue({}),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
		user: { count: vi.fn().mockResolvedValue(opts.users ?? 0) },
		$transaction: vi.fn(),
	}
	db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db))
	return db
}

const editableRole = { idRole: 5, code: 'ANALISTA', name: 'Analista', isSystem: false, active: true }

async function codeOf(promise: Promise<unknown>) {
	try {
		await promise
	} catch (e) {
		return e instanceof RoleServiceError ? e.code : 'OTHER'
	}
	return 'NONE'
}

describe('buildRoleCode', () => {
	it('uppercases, strips accents and joins with underscores', () => {
		expect(buildRoleCode('  Líder de Cobranza  ')).toBe('LIDER_DE_COBRANZA')
	})
})

describe('role code limits (VarChar(50))', () => {
	it('caps the generated code at 50 characters without a trailing underscore', () => {
		const code = buildRoleCode('Coordinador de operaciones comerciales y soporte regional')
		expect(code.length).toBeLessThanOrEqual(50)
		expect(code.endsWith('_')).toBe(false)
		expect(code.startsWith('COORDINADOR_DE_OPERACIONES')).toBe(true)
	})

	it('rejects a name with no letters or digits as an invalid name, not as a duplicate', async () => {
		expect(await codeOf(createRole(createDb() as never, { name: '***' }))).toBe('INVALID_NAME')
	})
})

describe('createRole', () => {
	it('creates a non-system role with a generated code and no grants', async () => {
		const db = createDb()
		const role = await createRole(db as never, { name: 'Auditor', description: 'Solo lectura' })
		expect(db.role.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ code: 'AUDITOR', name: 'Auditor', isSystem: false }),
			})
		)
		expect(role.code).toBe('AUDITOR')
		expect(db.rolePermission.upsert).not.toHaveBeenCalled()
	})

	it('rejects a code that already exists', async () => {
		const db = createDb({ byCode: { idRole: 1 } })
		expect(await codeOf(createRole(db as never, { name: 'Admin' }))).toBe('CODE_TAKEN')
	})
})

describe('updateRole', () => {
	it('updates name and description of an editable role', async () => {
		const db = createDb({ role: editableRole })
		await updateRole(db as never, 5, { name: 'Analista senior', description: null })
		expect(db.role.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idRole: 5 }, data: { name: 'Analista senior', description: null } })
		)
	})

	it('never edits ADMIN', async () => {
		const db = createDb({ role: { ...editableRole, code: 'ADMIN', isSystem: true } })
		expect(await codeOf(updateRole(db as never, 5, { name: 'X' }))).toBe('LOCKED_ROLE')
		expect(db.role.update).not.toHaveBeenCalled()
	})

	it('404s an unknown or inactive role', async () => {
		expect(await codeOf(updateRole(createDb() as never, 5, { name: 'X' }))).toBe('NOT_FOUND')
		const inactive = createDb({ role: { ...editableRole, active: false } })
		expect(await codeOf(updateRole(inactive as never, 5, { name: 'X' }))).toBe('NOT_FOUND')
	})
})

describe('setRolePermissions', () => {
	const actor = 'ADMIN'

	it('adds new grants, removes missing ones and reports the diff', async () => {
		const db = createDb({
			role: editableRole,
			current: [
				{ idPermission: 4, status: true, scope: null, minLevel: null, permission: { code: 'aportes.fondear' } },
				{ idPermission: 2, status: true, scope: 'OWN', minLevel: null, permission: { code: 'negocios.ver' } },
			],
		})
		const result = await setRolePermissions(db as never, 5, actor, {
			'negocios.ver': { scope: 'TEAM' },
			'negocios.exportar': { scope: 'TEAM', minLevelCode: 'LEVEL_2' },
		})
		expect(result.added).toEqual(['negocios.exportar'])
		expect(result.removed).toEqual(['aportes.fondear'])
		expect(result.changed).toEqual(['negocios.ver'])
		expect(db.rolePermission.upsert).toHaveBeenCalledTimes(2)
		expect(db.rolePermission.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idRole: 5, idPermission: { in: [4] } },
				data: { status: false },
			})
		)
	})

	it('writes nothing when the grants are unchanged', async () => {
		const db = createDb({
			role: editableRole,
			current: [
				{ idPermission: 4, status: true, scope: null, minLevel: null, permission: { code: 'aportes.fondear' } },
			],
		})
		const result = await setRolePermissions(db as never, 5, actor, { 'aportes.fondear': {} })
		expect(result).toEqual({ added: [], removed: [], changed: [] })
		expect(db.rolePermission.upsert).not.toHaveBeenCalled()
		expect(db.rolePermission.updateMany).not.toHaveBeenCalled()
	})

	it('locks ADMIN and SIN_ROL', async () => {
		for (const code of ['ADMIN', 'SIN_ROL']) {
			const db = createDb({ role: { ...editableRole, code, isSystem: true } })
			expect(await codeOf(setRolePermissions(db as never, 5, actor, {}))).toBe('LOCKED_ROLE')
			expect(db.rolePermission.upsert).not.toHaveBeenCalled()
		}
	})

	it('rejects removing roles.gestionar from the actor own role', async () => {
		const db = createDb({ role: editableRole })
		expect(await codeOf(setRolePermissions(db as never, 5, 'ANALISTA', { 'aportes.fondear': {} }))).toBe('SELF_LOCKOUT')
		expect(db.rolePermission.upsert).not.toHaveBeenCalled()
	})

	it('allows the actor own role when roles.gestionar stays', async () => {
		const db = createDb({
			role: editableRole,
			current: [
				{ idPermission: 1, status: true, scope: null, minLevel: null, permission: { code: 'roles.gestionar' } },
			],
		})
		await setRolePermissions(db as never, 5, 'ANALISTA', {
			'roles.gestionar': {},
			'aportes.fondear': {},
		})
		expect(db.rolePermission.upsert).toHaveBeenCalledTimes(1)
	})

	it('only ADMIN may grant roles.gestionar or usuarios.ver_como', async () => {
		const db = createDb({ role: { ...editableRole, code: 'OTRO' } })
		expect(
			await codeOf(setRolePermissions(db as never, 5, 'ANALISTA', { 'roles.gestionar': {} }))
		).toBe('ADMIN_ONLY_PERMISSION')
		expect(db.rolePermission.upsert).not.toHaveBeenCalled()

		const okDb = createDb({ role: { ...editableRole, code: 'OTRO' } })
		await setRolePermissions(okDb as never, 5, 'ADMIN', { 'roles.gestionar': {} })
		expect(okDb.rolePermission.upsert).toHaveBeenCalledTimes(1)
	})

	it('rejects unknown permission codes', async () => {
		const db = createDb({ role: editableRole })
		expect(await codeOf(setRolePermissions(db as never, 5, actor, { 'nope.ver': {} }))).toBe('INVALID_PERMISSION')
	})

	it('requires a scope on scoped permissions and forbids it elsewhere', async () => {
		const db = createDb({ role: editableRole })
		expect(await codeOf(setRolePermissions(db as never, 5, actor, { 'negocios.ver': {} }))).toBe('INVALID_GRANT')
		expect(await codeOf(setRolePermissions(db as never, 5, actor, { 'aportes.fondear': { scope: 'OWN' } }))).toBe('INVALID_GRANT')
	})

	it('validates the minimum level', async () => {
		const db = createDb({ role: editableRole })
		expect(await codeOf(setRolePermissions(db as never, 5, actor, { 'negocios.ver': { scope: 'OWN', minLevelCode: 'LEVEL_2' } }))).toBe('INVALID_GRANT')
		expect(await codeOf(setRolePermissions(db as never, 5, actor, { 'negocios.exportar': { scope: 'OWN', minLevelCode: 'LEVEL_9' } }))).toBe('INVALID_GRANT')
	})
})

describe('deactivateRole', () => {
	it('soft deletes an unused custom role', async () => {
		const db = createDb({ role: editableRole })
		await deactivateRole(db as never, 5, 'ADMIN')
		expect(db.role.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idRole: 5 }, data: { active: false } })
		)
	})

	it('refuses system roles, the actor role and roles with active users', async () => {
		const system = createDb({ role: { ...editableRole, isSystem: true } })
		expect(await codeOf(deactivateRole(system as never, 5, 'ADMIN'))).toBe('SYSTEM_ROLE')
		const own = createDb({ role: editableRole })
		expect(await codeOf(deactivateRole(own as never, 5, 'ANALISTA'))).toBe('SELF_LOCKOUT')
		const used = createDb({ role: editableRole, users: 3 })
		expect(await codeOf(deactivateRole(used as never, 5, 'ADMIN'))).toBe('ROLE_IN_USE')
		expect(used.role.update).not.toHaveBeenCalled()
	})
})
