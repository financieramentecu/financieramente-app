/**
 * In-memory stand-in for the Prisma delegates used by `partner.service`.
 * It implements only the `where` shapes the service emits, and exposes
 * `delete` / `deleteMany` spies so soft-delete compliance can be asserted.
 */
import { vi } from 'vitest'

export interface FakeUserRow {
	idUser: number
	name: string
	lastName: string | null
	typeIdentity: string
	identityNumber: string | null
	email: string
	phone: string | null
	active: boolean
	activatedAt: Date | null
	createdAt: Date
	entryDate: Date
	idRole: number | null
	idLevel: number | null
	idCategory: number | null
	idUserLeader: number | null
	password: string | null
	ssoOnly: boolean
	roleCode: string | null
	levelCode: string | null
}

type Where = Record<string, unknown>

export function seedUser(overrides: Partial<FakeUserRow> = {}): FakeUserRow {
	return {
		idUser: 1,
		name: 'Luis',
		lastName: 'Pérez',
		typeIdentity: 'CC',
		identityNumber: '111',
		email: 'luis@corp.com',
		phone: null,
		active: true,
		activatedAt: new Date('2026-01-01T00:00:00Z'),
		createdAt: new Date('2026-01-01T00:00:00Z'),
		entryDate: new Date('2026-01-01T12:00:00Z'),
		idRole: 5,
		idLevel: 3,
		idCategory: 1,
		idUserLeader: null,
		password: 'hash',
		ssoOnly: false,
		roleCode: 'AGENTE',
		levelCode: 'LEVEL_3',
		...overrides,
	}
}

export function createFakePartnerDb(initial: FakeUserRow[]) {
	const users = initial.map((u) => ({ ...u }))
	let nextId = Math.max(0, ...users.map((u) => u.idUser)) + 1
	const createdData: Record<string, unknown>[] = []

	const reference = {
		role: { idRole: 90, code: 'PARTNER' } as {
			idRole: number
			code: string
		} | null,
		level: { idLevel: 91, code: 'PARTNER_EXTERNAL' } as {
			idLevel: number
			code: string
		} | null,
		category: { id: 92, name: 'Partner Externo' } as {
			id: number
			name: string
		} | null,
	}

	function project(user: FakeUserRow) {
		const leader = users.find((u) => u.idUser === user.idUserLeader)
		return {
			...user,
			role: user.roleCode ? { code: user.roleCode } : null,
			level: user.levelCode ? { code: user.levelCode } : null,
			leader: leader
				? {
						idUser: leader.idUser,
						name: leader.name,
						lastName: leader.lastName,
						email: leader.email,
						level: leader.levelCode ? { code: leader.levelCode } : null,
					}
				: null,
		}
	}

	function matches(user: FakeUserRow, where: Where): boolean {
		if ('idUser' in where && user.idUser !== where.idUser) return false
		if ('NOT' in where) {
			const not = where.NOT as { idUser: number }
			if (user.idUser === not.idUser) return false
		}
		if ('active' in where && user.active !== where.active) return false
		if ('typeIdentity' in where && user.typeIdentity !== where.typeIdentity)
			return false
		if (
			'identityNumber' in where &&
			user.identityNumber !== where.identityNumber
		)
			return false
		if ('email' in where) {
			const email = where.email as { equals: string; mode: string }
			if (user.email.toLowerCase() !== email.equals.toLowerCase()) return false
		}
		if ('role' in where) {
			const role = where.role as { code: string }
			if (user.roleCode !== role.code) return false
		}
		if ('level' in where) {
			const level = where.level as { code: string }
			if (user.levelCode !== level.code) return false
		}
		return true
	}

	const userDelegate = {
		findUnique: vi.fn(async ({ where }: { where: Where }) => {
			const found = users.find((u) => matches(u, where))
			return found ? project(found) : null
		}),
		findFirst: vi.fn(async ({ where }: { where: Where }) => {
			const found = users.find((u) => matches(u, where))
			return found ? project(found) : null
		}),
		findMany: vi.fn(async ({ where }: { where: Where }) =>
			users.filter((u) => matches(u, where)).map(project)
		),
		create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
			createdData.push(data)
			const role = reference.role
			const level = reference.level
			const row: FakeUserRow = {
				idUser: nextId++,
				name: data.name as string,
				lastName: (data.lastName as string | null) ?? null,
				typeIdentity: data.typeIdentity as string,
				identityNumber: (data.identityNumber as string | null) ?? null,
				email: data.email as string,
				phone: (data.phone as string | null) ?? null,
				active: data.active as boolean,
				activatedAt: (data.activatedAt as Date | null) ?? null,
				createdAt: new Date('2026-10-11T12:00:00Z'),
				entryDate: data.entryDate as Date,
				idRole: data.idRole as number,
				idLevel: data.idLevel as number,
				idCategory: data.idCategory as number,
				idUserLeader: data.idUserLeader as number,
				password: (data.password as string | null) ?? null,
				ssoOnly: data.ssoOnly as boolean,
				roleCode: role?.code ?? null,
				levelCode: level?.code ?? null,
			}
			users.push(row)
			return project(row)
		}),
		update: vi.fn(
			async ({
				where,
				data,
			}: {
				where: { idUser: number }
				data: Partial<FakeUserRow>
			}) => {
				const found = users.find((u) => u.idUser === where.idUser)
				if (!found) throw new Error('not found')
				Object.assign(found, data)
				return project(found)
			}
		),
		delete: vi.fn(),
		deleteMany: vi.fn(),
	}

	const level = {
		findUnique: vi.fn(async () => reference.level),
		findMany: vi.fn(async () => [] as unknown[]),
	}

	const db = {
		user: userDelegate,
		role: { findUnique: vi.fn(async () => reference.role) },
		level,
		category: { findFirst: vi.fn(async () => reference.category) },
		$transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
			// Snapshot / rollback so a throwing transaction leaves no rows.
			const snapshot = users.map((u) => ({ ...u }))
			try {
				return await callback(db)
			} catch (error) {
				users.splice(0, users.length, ...snapshot)
				throw error
			}
		}),
	}

	return { db, users, reference, createdData }
}
