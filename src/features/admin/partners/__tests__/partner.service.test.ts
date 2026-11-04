import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import {
	createFakePartnerDb,
	seedUser,
	type FakeUserRow,
} from './fake-partner-db'

const dbRef = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/lib/prisma', () => ({
	get prisma() {
		return dbRef.current
	},
}))

vi.mock('@/features/auth/services/account-token.service', () => ({
	issueToken: vi.fn(),
	revokeOpenTokens: vi.fn(),
}))

import {
	issueToken,
	revokeOpenTokens,
} from '@/features/auth/services/account-token.service'
import {
	PartnerServiceError,
	createPartner,
	deactivatePartner,
	listLeaderCandidates,
	listLeaderLevels,
	listPartners,
	reactivatePartner,
	reissuePartnerActivation,
	updatePartner,
} from '../services/partner.service'

const NOW = new Date('2026-10-11T03:00:00.000Z') // 22:00 Oct 10 in Bogotá
const INPUT = {
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1020304050',
	email: 'ana@partner.com',
	phone: '3001234567',
	leaderId: 10,
}

let fake: ReturnType<typeof createFakePartnerDb>

function leader(overrides: Partial<FakeUserRow> = {}): FakeUserRow {
	return seedUser({ idUser: 10, email: 'leader@corp.com', ...overrides })
}

function partnerRow(overrides: Partial<FakeUserRow> = {}): FakeUserRow {
	return seedUser({
		idUser: 20,
		email: 'p@partner.com',
		identityNumber: '999',
		roleCode: 'PARTNER',
		levelCode: 'PARTNER_EXTERNAL',
		idUserLeader: 10,
		password: null,
		ssoOnly: true,
		activatedAt: null,
		...overrides,
	})
}

function setup(users: FakeUserRow[]) {
	fake = createFakePartnerDb(users)
	dbRef.current = fake.db
}

async function expectCode(promise: Promise<unknown>, code: string) {
	const error = await promise.then(
		() => null,
		(e: unknown) => e
	)
	expect(error).toBeInstanceOf(PartnerServiceError)
	expect((error as PartnerServiceError).code).toBe(code)
	return error as PartnerServiceError
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(issueToken).mockResolvedValue({
		rawToken: 'raw-token',
		expiresAt: new Date('2026-10-14T03:00:00Z'),
	})
	vi.mocked(revokeOpenTokens).mockResolvedValue(2)
	setup([leader()])
})

describe('createPartner', () => {
	it('creates the user with server-assigned role, level, category and state', async () => {
		const { partner, rawToken } = await createPartner(INPUT, NOW)

		expect(rawToken).toBe('raw-token')
		expect(partner.status).toBe('PENDING')
		expect(partner.email).toBe('ana@partner.com')
		expect(partner.leader?.id).toBe(10)

		const data = fake.createdData[0]
		expect(data).toMatchObject({
			name: 'Ana',
			lastName: 'Gómez',
			typeIdentity: 'CC',
			identityNumber: '1020304050',
			email: 'ana@partner.com',
			phone: '3001234567',
			idRole: 90,
			idLevel: 91,
			idCategory: 92,
			idUserLeader: 10,
			active: true,
			activatedAt: null,
			password: null,
			ssoOnly: true,
		})
	})

	it('sets entryDate to the Bogotá calendar day at noon UTC', async () => {
		await createPartner(INPUT, NOW)
		const data = fake.createdData[0] as { entryDate: Date }
		// 03:00Z on Oct 11 is still Oct 10 in Bogotá (UTC-5).
		expect(data.entryDate.toISOString()).toBe('2026-10-10T12:00:00.000Z')
	})

	it('creates the user and the ACTIVATION token inside ONE transaction', async () => {
		await createPartner(INPUT, NOW)

		expect(fake.db.$transaction).toHaveBeenCalledTimes(1)
		expect(issueToken).toHaveBeenCalledTimes(1)
		const [txClient, tokenInput, now] = vi.mocked(issueToken).mock.calls[0]
		expect(txClient).toBe(fake.db)
		expect(tokenInput).toEqual({ idUser: 11, type: 'ACTIVATION' })
		expect(now).toEqual(NOW)
	})

	it('rolls the user back when issuing the token fails', async () => {
		vi.mocked(issueToken).mockRejectedValueOnce(new Error('db down'))
		await expect(createPartner(INPUT, NOW)).rejects.toThrow('db down')
		expect(fake.users.map((u) => u.idUser)).toEqual([10])
	})

	it('resolves reference data by code or name, never by hard-coded id', async () => {
		await createPartner(INPUT, NOW)
		expect(fake.db.role.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { code: 'PARTNER' } })
		)
		expect(fake.db.level.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { code: 'PARTNER_EXTERNAL' } })
		)
		expect(fake.db.category.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ name: 'Partner Externo' }),
			})
		)
	})

	it.each(['role', 'level', 'category'] as const)(
		'fails with a clear seed hint when %s reference data is missing',
		async (key) => {
			;(fake.reference as Record<string, unknown>)[key] = null
			const error = await expectCode(
				createPartner(INPUT, NOW),
				'REFERENCE_DATA_MISSING'
			)
			expect(error.message).toContain('npm run prisma:seed:partner')
			expect(issueToken).not.toHaveBeenCalled()
			expect(fake.db.user.create).not.toHaveBeenCalled()
		}
	)

	describe('uniqueness (PM-04)', () => {
		it('rejects a duplicate email case-insensitively', async () => {
			setup([leader(), seedUser({ idUser: 30, email: 'ANA@Partner.com' })])
			const error = await expectCode(createPartner(INPUT, NOW), 'EMAIL_TAKEN')
			expect(error.field).toBe('email')
			expect(error.message).toBe('Este correo electrónico ya está registrado')
			expect(issueToken).not.toHaveBeenCalled()
			expect(fake.db.user.create).not.toHaveBeenCalled()
		})

		it('rejects a duplicate identity (type + number)', async () => {
			setup([
				leader(),
				seedUser({
					idUser: 30,
					email: 'other@x.com',
					typeIdentity: 'CC',
					identityNumber: '1020304050',
				}),
			])
			const error = await expectCode(
				createPartner(INPUT, NOW),
				'IDENTITY_TAKEN'
			)
			expect(error.field).toBe('identityNumber')
			expect(error.message).toBe('Este documento ya está registrado')
			expect(issueToken).not.toHaveBeenCalled()
		})

		it('allows the same number under a different document type', async () => {
			setup([
				leader(),
				seedUser({
					idUser: 30,
					email: 'other@x.com',
					typeIdentity: 'CE',
					identityNumber: '1020304050',
				}),
			])
			await expect(createPartner(INPUT, NOW)).resolves.toBeDefined()
		})

		it.each([
			['users_email_key', 'EMAIL_TAKEN'],
			['user_typeIdentity_identityNumber_key', 'IDENTITY_TAKEN'],
		])(
			'maps a concurrent unique violation on %s to %s',
			async (target, code) => {
				fake.db.user.create.mockRejectedValueOnce(
					new Prisma.PrismaClientKnownRequestError('unique', {
						code: 'P2002',
						clientVersion: 'test',
						meta: { target },
					})
				)
				await expectCode(createPartner(INPUT, NOW), code)
			}
		)
	})

	describe('leader rules (PM-02, PM-03)', () => {
		it('rejects an unknown leader', async () => {
			await expectCode(
				createPartner({ ...INPUT, leaderId: 999 }, NOW),
				'INVALID_LEADER'
			)
			expect(fake.db.user.create).not.toHaveBeenCalled()
		})

		it('rejects an inactive leader', async () => {
			setup([leader({ active: false })])
			await expectCode(createPartner(INPUT, NOW), 'INVALID_LEADER')
		})

		it.each(['LEVEL_0', 'GENERAL_LEVEL', 'PARTNER_EXTERNAL'])(
			'rejects a leader at %s',
			async (levelCode) => {
				setup([leader({ levelCode })])
				await expectCode(createPartner(INPUT, NOW), 'INVALID_LEADER')
				expect(issueToken).not.toHaveBeenCalled()
			}
		)

		it('rejects a PARTNER user as leader even at a valid level', async () => {
			setup([leader({ roleCode: 'PARTNER', levelCode: 'LEVEL_2' })])
			const error = await expectCode(
				createPartner(INPUT, NOW),
				'INVALID_LEADER'
			)
			expect(error.message).toBe('Un partner no puede ser líder')
		})

		it.each(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'])(
			'accepts a leader at %s',
			async (levelCode) => {
				setup([leader({ levelCode })])
				await expect(createPartner(INPUT, NOW)).resolves.toBeDefined()
			}
		)
	})

	it('stores nullable contact fields as null', async () => {
		await createPartner(
			{ ...INPUT, lastName: undefined, phone: undefined },
			NOW
		)
		expect(fake.createdData[0]).toMatchObject({ lastName: null, phone: null })
	})
})

describe('listPartners', () => {
	it('returns only PARTNER-role users mapped to DTOs', async () => {
		setup([
			leader(),
			partnerRow(),
			partnerRow({ idUser: 21, email: 'q@p.com', active: false }),
		])
		const list = await listPartners()
		expect(fake.db.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { role: { code: 'PARTNER' } },
				orderBy: { createdAt: 'desc' },
			})
		)
		expect(list.map((p) => p.id).sort()).toEqual([20, 21])
		expect(list.find((p) => p.id === 21)?.status).toBe('DEACTIVATED')
	})
})

describe('deactivatePartner [SD]', () => {
	beforeEach(() =>
		setup([
			leader(),
			partnerRow({ activatedAt: new Date('2026-02-01T00:00:00Z') }),
		])
	)

	it('sets active=false and revokes ALL open tokens in one transaction, never deleting', async () => {
		const result = await deactivatePartner(20)

		expect(result.active).toBe(false)
		expect(result.status).toBe('DEACTIVATED')
		expect(fake.db.$transaction).toHaveBeenCalledTimes(1)
		expect(fake.db.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idUser: 20 },
				data: { active: false },
			})
		)
		expect(revokeOpenTokens).toHaveBeenCalledWith(fake.db, { idUser: 20 })
		expect(fake.db.user.delete).not.toHaveBeenCalled()
		expect(fake.db.user.deleteMany).not.toHaveBeenCalled()
	})

	it('keeps the stored password and activatedAt', async () => {
		await deactivatePartner(20)
		const data = vi.mocked(fake.db.user.update).mock.calls[0][0].data
		expect(data).not.toHaveProperty('password')
		expect(data).not.toHaveProperty('activatedAt')
	})

	it('refuses an already deactivated partner', async () => {
		setup([leader(), partnerRow({ active: false })])
		await expectCode(deactivatePartner(20), 'INVALID_STATE')
		expect(revokeOpenTokens).not.toHaveBeenCalled()
	})

	it.each([[10], [999]])(
		'treats non-partner or unknown id %i as not found (cannot touch non-partners)',
		async (id) => {
			await expectCode(deactivatePartner(id), 'NOT_FOUND')
			expect(fake.db.user.update).not.toHaveBeenCalled()
		}
	)

	it('rolls back the deactivation when token revocation fails', async () => {
		vi.mocked(revokeOpenTokens).mockRejectedValueOnce(new Error('boom'))
		await expect(deactivatePartner(20)).rejects.toThrow('boom')
		expect(fake.users.find((u) => u.idUser === 20)?.active).toBe(true)
	})
})

describe('reactivatePartner [SD]', () => {
	it('sets active=true and keeps activatedAt and password untouched', async () => {
		const activatedAt = new Date('2026-02-01T00:00:00Z')
		setup([
			leader(),
			partnerRow({
				active: false,
				activatedAt,
				password: 'hash',
				ssoOnly: false,
			}),
		])

		const result = await reactivatePartner(20)

		expect(result.status).toBe('ACTIVE')
		expect(fake.db.user.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idUser: 20 }, data: { active: true } })
		)
		expect(issueToken).not.toHaveBeenCalled()
		const row = fake.users.find((u) => u.idUser === 20)!
		expect(row.activatedAt).toEqual(activatedAt)
		expect(row.password).toBe('hash')
	})

	it('returns PENDING for a never-activated partner (admin must resend)', async () => {
		setup([leader(), partnerRow({ active: false, activatedAt: null })])
		const result = await reactivatePartner(20)
		expect(result.status).toBe('PENDING')
		expect(issueToken).not.toHaveBeenCalled()
	})

	it('refuses an already active partner', async () => {
		setup([leader(), partnerRow()])
		await expectCode(reactivatePartner(20), 'INVALID_STATE')
		expect(fake.db.user.update).not.toHaveBeenCalled()
	})

	it('treats a non-partner as not found', async () => {
		await expectCode(reactivatePartner(10), 'NOT_FOUND')
	})
})

describe('reissuePartnerActivation', () => {
	it('issues a fresh ACTIVATION token for an active, never-activated partner', async () => {
		setup([leader(), partnerRow()])
		const result = await reissuePartnerActivation(20, NOW)

		expect(result.rawToken).toBe('raw-token')
		expect(result.partner.status).toBe('PENDING')
		// issueToken itself revokes the previous open ACTIVATION token.
		expect(issueToken).toHaveBeenCalledWith(
			expect.anything(),
			{ idUser: 20, type: 'ACTIVATION' },
			NOW
		)
	})

	it('refuses an already activated partner (PM-06)', async () => {
		setup([leader(), partnerRow({ activatedAt: new Date() })])
		const error = await expectCode(
			reissuePartnerActivation(20, NOW),
			'INVALID_STATE'
		)
		expect(error.message).toBe('El partner ya activó su cuenta')
		expect(issueToken).not.toHaveBeenCalled()
	})

	it('refuses a deactivated partner', async () => {
		setup([leader(), partnerRow({ active: false })])
		const error = await expectCode(
			reissuePartnerActivation(20, NOW),
			'INVALID_STATE'
		)
		expect(error.message).toBe(
			'El partner está desactivado. Reactívalo antes de reenviar la activación'
		)
		expect(issueToken).not.toHaveBeenCalled()
	})

	it('treats a non-partner as not found', async () => {
		await expectCode(reissuePartnerActivation(10, NOW), 'NOT_FOUND')
	})
})

describe('listLeaderCandidates', () => {
	it('returns active users of the level, excluding PARTNER-role users', async () => {
		setup([
			leader({ idUser: 1, name: 'Zoe', levelCode: 'LEVEL_2' }),
			leader({
				idUser: 2,
				name: 'Ana',
				email: 'a@c.com',
				levelCode: 'LEVEL_2',
			}),
			leader({
				idUser: 3,
				email: 'i@c.com',
				levelCode: 'LEVEL_2',
				active: false,
			}),
			leader({
				idUser: 4,
				email: 'p@c.com',
				levelCode: 'LEVEL_2',
				roleCode: 'PARTNER',
			}),
			leader({ idUser: 5, email: 'o@c.com', levelCode: 'LEVEL_3' }),
		])

		const result = await listLeaderCandidates('LEVEL_2')

		expect(result.map((u) => u.id)).toEqual([2, 1]) // sorted by name
		expect(fake.db.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					active: true,
					level: { code: 'LEVEL_2' },
				}),
			})
		)
	})

	it.each(['LEVEL_0', 'GENERAL_LEVEL', 'PARTNER_EXTERNAL', 'foo', ''])(
		'rejects level code %s without querying',
		async (code) => {
			await expectCode(listLeaderCandidates(code), 'INVALID_LEADER')
			expect(fake.db.user.findMany).not.toHaveBeenCalled()
		}
	)
})

describe('listLeaderLevels', () => {
	it('queries only LEVEL_1..LEVEL_5 and returns code + display name', async () => {
		fake.db.level.findMany.mockResolvedValueOnce([
			{ code: 'LEVEL_1', name: 'Nivel 1' },
			{ code: 'LEVEL_2', name: 'Director' },
		])
		const result = await listLeaderLevels()
		expect(result).toEqual([
			{ code: 'LEVEL_1', name: 'Nivel 1' },
			{ code: 'LEVEL_2', name: 'Director' },
		])
		expect(fake.db.level.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					code: { in: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'] },
				}),
			})
		)
	})
})

describe('updatePartner', () => {
	const EDIT = {
		name: 'Ana',
		lastName: 'Gómez',
		typeIdentity: 'CC',
		identityNumber: '999',
		phone: '3001234567',
		leaderId: 10,
	}

	function setupEditable(overrides: Partial<FakeUserRow> = {}) {
		setup([
			leader(),
			leader({ idUser: 11, email: 'l4@corp.com', levelCode: 'LEVEL_4' }),
			partnerRow(overrides),
		])
	}

	it('updates only the editable fields and keeps the protected ones', async () => {
		setupEditable({ name: 'Old', phone: null, lastName: null })
		const before = { ...fake.users.find((u) => u.idUser === 20)! }

		const { partner, changedFields } = await updatePartner(20, EDIT)

		expect(partner.name).toBe('Ana')
		expect(partner.phone).toBe('3001234567')
		expect(partner.lastName).toBe('Gómez')
		expect(changedFields.sort()).toEqual(['lastName', 'name', 'phone'])
		const after = fake.users.find((u) => u.idUser === 20)!
		for (const key of [
			'email',
			'idRole',
			'idLevel',
			'idCategory',
			'active',
			'activatedAt',
			'password',
			'ssoOnly',
			'entryDate',
		] as const) {
			expect(after[key]).toEqual(before[key])
		}
		const data = fake.db.user.update.mock.calls[0][0].data as Record<
			string,
			unknown
		>
		expect(Object.keys(data).sort()).toEqual(
			[
				'identityNumber',
				'idUserLeader',
				'lastName',
				'name',
				'phone',
				'typeIdentity',
			].sort()
		)
	})

	it('changes the leader to an active LEVEL_4 user', async () => {
		setupEditable()
		const { partner, changedFields } = await updatePartner(20, {
			...EDIT,
			name: 'Ana',
			lastName: 'Pérez',
			phone: undefined,
			leaderId: 11,
		})
		expect(partner.leader?.id).toBe(11)
		expect(partner.leader?.levelCode).toBe('LEVEL_4')
		expect(changedFields).toContain('leaderId')
	})

	it('reports no changed fields when nothing differs and still succeeds', async () => {
		setupEditable({ name: 'Ana', lastName: 'Gómez', phone: '3001234567' })
		const { changedFields, partner } = await updatePartner(20, EDIT)
		expect(changedFields).toEqual([])
		expect(partner.id).toBe(20)
	})

	it.each([
		['pending', { activatedAt: null, active: true }],
		['active', { activatedAt: new Date('2026-02-01T00:00:00Z'), active: true }],
		['deactivated', { activatedAt: null, active: false }],
	])('allows editing a %s partner', async (_label, state) => {
		setupEditable(state)
		const { partner } = await updatePartner(20, { ...EDIT, name: 'Nuevo' })
		expect(partner.name).toBe('Nuevo')
		expect(partner.active).toBe(state.active)
	})

	it.each([
		['unknown id', 999],
		['non-partner user', 10],
	])('throws NOT_FOUND for %s and writes nothing', async (_label, id) => {
		setupEditable()
		await expectCode(updatePartner(id, EDIT), 'NOT_FOUND')
		expect(fake.db.user.update).not.toHaveBeenCalled()
	})

	it.each([
		['inactive', leader({ idUser: 12, active: false })],
		['LEVEL_0', leader({ idUser: 12, levelCode: 'LEVEL_0' })],
		['GENERAL_LEVEL', leader({ idUser: 12, levelCode: 'GENERAL_LEVEL' })],
		[
			'another partner',
			leader({
				idUser: 12,
				roleCode: 'PARTNER',
				levelCode: 'PARTNER_EXTERNAL',
			}),
		],
		[
			'PARTNER_EXTERNAL level',
			leader({ idUser: 12, levelCode: 'PARTNER_EXTERNAL' }),
		],
	])(
		'rejects a %s leader with INVALID_LEADER and persists nothing',
		async (_label, candidate) => {
			setup([leader(), candidate, partnerRow()])
			const error = await expectCode(
				updatePartner(20, { ...EDIT, leaderId: 12 }),
				'INVALID_LEADER'
			)
			expect(error.field).toBe('leaderId')
			expect(fake.db.user.update).not.toHaveBeenCalled()
		}
	)

	it('rejects an unknown leader and the partner itself', async () => {
		setupEditable()
		await expectCode(
			updatePartner(20, { ...EDIT, leaderId: 777 }),
			'INVALID_LEADER'
		)
		await expectCode(
			updatePartner(20, { ...EDIT, leaderId: 20 }),
			'INVALID_LEADER'
		)
		expect(fake.db.user.update).not.toHaveBeenCalled()
	})

	it('rejects an identity already used by ANOTHER user with IDENTITY_TAKEN', async () => {
		setup([
			leader(),
			partnerRow(),
			partnerRow({ idUser: 21, email: 'b@partner.com', identityNumber: '555' }),
		])
		const error = await expectCode(
			updatePartner(20, { ...EDIT, identityNumber: '555' }),
			'IDENTITY_TAKEN'
		)
		expect(error.field).toBe('identityNumber')
		expect(fake.db.user.update).not.toHaveBeenCalled()
	})

	it('excludes the partner itself from the identity check', async () => {
		setupEditable()
		await expect(
			updatePartner(20, { ...EDIT, name: 'Same id' })
		).resolves.toBeDefined()
		const where = fake.db.user.findFirst.mock.calls
			.map((call) => call[0].where as Record<string, unknown>)
			.find((w) => 'typeIdentity' in w)
		expect(where).toMatchObject({ NOT: { idUser: 20 } })
	})

	it('maps a concurrent identity unique violation (P2002) to IDENTITY_TAKEN', async () => {
		setupEditable()
		fake.db.user.update.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('dup', {
				code: 'P2002',
				clientVersion: 'x',
				meta: { target: ['typeIdentity', 'identityNumber'] },
			})
		)
		await expectCode(
			updatePartner(20, { ...EDIT, name: 'Race' }),
			'IDENTITY_TAKEN'
		)
	})

	it('never deletes, never issues tokens', async () => {
		setupEditable()
		await updatePartner(20, { ...EDIT, name: 'X' })
		expect(fake.db.user.delete).not.toHaveBeenCalled()
		expect(fake.db.user.deleteMany).not.toHaveBeenCalled()
		expect(issueToken).not.toHaveBeenCalled()
	})
})
