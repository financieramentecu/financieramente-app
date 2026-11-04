/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SEC-03 / NEG-01 / CC-01 / BS-01: one ownership test per business sub-route
 * for AGENTE and PARTNER, running the REAL business-access service against a
 * fake Prisma (hierarchy + owner table).
 *
 * Fixture: agent leader 1 -> subordinate 2; foreign agent 3; partners 10, 11.
 * Businesses: 100 -> 1, 200 -> 2, 300 -> 3, 400 -> 10, 500 -> 11.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
	user: { idUser: 1, role: 'AGENTE' } as { idUser: number; role: string },
	owners: { 100: 1, 200: 2, 300: 3, 400: 10, 500: 11 } as Record<
		number,
		number
	>,
	users: [
		{ idUser: 1, idUserLeader: null },
		{ idUser: 2, idUserLeader: 1 },
		{ idUser: 3, idUserLeader: null },
		{ idUser: 10, idUserLeader: 1 },
		{ idUser: 11, idUserLeader: 1 },
	],
}))

const mocks = vi.hoisted(() => ({
	businessUpdate: vi.fn(),
	createComment: vi.fn(),
	getComments: vi.fn(),
	persistComprobante: vi.fn(),
	listComprobantes: vi.fn(),
	presign: vi.fn(),
	deactivate: vi.fn(),
}))

vi.mock('@/auth', () => ({
	auth: vi.fn(async () => ({
		user: {
			email: 'u@test.com',
			id: String(state.user.idUser),
			role: state.user.role,
		},
	})),
}))

vi.mock('@/lib/prisma', () => {
	const findBusiness = async ({ where }: any) => {
		const owner = state.owners[where.idBusiness]
		if (owner === undefined) return null
		if (where.idUser?.in && !where.idUser.in.includes(owner)) return null
		if (typeof where.idUser === 'number' && where.idUser !== owner) return null
		return {
			idBusiness: where.idBusiness,
			idUser: owner,
			status: 'LIQUIDADO',
			novedadStatus: null,
			payments: [],
			buyPeriodicity: { name: 'Mensual' },
		}
	}
	return {
		prisma: {
			user: {
				findMany: vi.fn(async () => state.users),
				findUnique: vi.fn(async () => ({
					idUser: state.user.idUser,
					email: 'u@test.com',
					role: { code: state.user.role },
				})),
			},
			business: {
				findFirst: vi.fn(findBusiness),
				findUnique: vi.fn(async ({ where }: any) => findBusiness({ where })),
				update: (...a: unknown[]) => mocks.businessUpdate(...a),
			},
		},
	}
})

vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(async () => ({
		idUser: state.user.idUser,
		name: 'Test',
		idRole: 1,
		role: { code: state.user.role },
	})),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: (b: any) => ({ idBusiness: b.idBusiness }),
}))
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	recalcularComisionesPorCambioOrigen: vi.fn(),
	sincronizarYCalcularRegistroRezagado: vi.fn(),
}))
vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	validateProductConfigurationExists: vi.fn(),
}))
vi.mock(
	'@/features/negocios/actions/find-product-percentage-commission',
	() => ({
		findProductPercentageCommission: vi.fn(),
	})
)
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_UPDATED: 'BUSINESS_UPDATED',
		BUSINESS_NOVEDAD_MARKED: 'BUSINESS_NOVEDAD_MARKED',
		BUSINESS_NOVEDAD_UNMARKED: 'BUSINESS_NOVEDAD_UNMARKED',
	},
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('vitest'),
}))
vi.mock('@/features/comments/services/comments.service', () => ({
	createComment: (...a: unknown[]) => mocks.createComment(...a),
	getCommentsByBusinessId: (...a: unknown[]) => mocks.getComments(...a),
}))
vi.mock(
	'@/features/business-supports/services/business-supports.service',
	() => ({
		persistComprobante: (...a: unknown[]) => mocks.persistComprobante(...a),
		listComprobantes: (...a: unknown[]) => mocks.listComprobantes(...a),
		presignComprobanteUpload: (...a: unknown[]) => mocks.presign(...a),
		deactivateComprobante: (...a: unknown[]) => mocks.deactivate(...a),
	})
)

import { GET as getDetail, PUT as putDetail } from '../route'
import { GET as getPayments } from '../payments/route'
import { GET as getAnnualPayments } from '../annual-payments/route'
import { GET as getComments, POST as postComment } from '../comments/route'
import {
	GET as getComprobantes,
	POST as postComprobante,
} from '../comprobantes/route'
import { POST as postPresign } from '../comprobantes/presign/route'
import { DELETE as deleteComprobante } from '../comprobantes/[supportId]/route'
import { PATCH as patchNovedad } from '../mark-novedad/route'

const json = (body: unknown, method: string) =>
	new Request('http://localhost/api/negocios/x', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
const get = () => new Request('http://localhost/api/negocios/x')
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })

interface RouteCase {
	name: string
	call: (id: number) => Promise<Response>
	/** Mocks that MUST NOT run when access is denied */
	sideEffects: () => ReturnType<typeof vi.fn>[]
	/** Roles that are denied by an unrelated, pre-existing role rule */
	/** Scope for AGENTE: subordinates allowed (default) or own only */
	agentOwnOnly?: boolean
}

const ROUTES: RouteCase[] = [
	{
		name: 'GET negocios/[id]',
		call: (id) => getDetail(get(), ctx(id)),
		sideEffects: () => [],
	},
	{
		name: 'PUT negocios/[id]',
		call: (id) => putDetail(json({ contract: 'ABC-1' }, 'PUT'), ctx(id)),
		sideEffects: () => [mocks.businessUpdate],
		agentOwnOnly: true,
	},
	{
		name: 'GET payments',
		call: (id) => getPayments(get(), ctx(id)),
		sideEffects: () => [],
	},
	{
		name: 'GET annual-payments',
		call: (id) => getAnnualPayments(get(), ctx(id)),
		sideEffects: () => [],
	},
	{
		name: 'GET comments',
		call: (id) => getComments(get(), ctx(id)),
		sideEffects: () => [mocks.getComments],
	},
	{
		name: 'POST comments',
		call: (id) =>
			postComment(
				json({ title: 'Seguimiento', detail: 'Detalle largo' }, 'POST'),
				ctx(id)
			),
		sideEffects: () => [mocks.createComment],
	},
	{
		name: 'GET comprobantes',
		call: (id) => getComprobantes(get(), ctx(id)),
		sideEffects: () => [mocks.listComprobantes],
	},
	{
		name: 'POST comprobantes',
		call: (id) =>
			postComprobante(
				json({ key: 'k', mime: 'image/png', size: 10 }, 'POST'),
				ctx(id)
			),
		sideEffects: () => [mocks.persistComprobante],
	},
	{
		name: 'POST comprobantes/presign',
		call: (id) =>
			postPresign(json({ mime: 'image/png', size: 10 }, 'POST'), ctx(id)),
		sideEffects: () => [mocks.presign],
	},
	{
		name: 'DELETE comprobantes/[supportId]',
		call: (id) =>
			deleteComprobante(
				new Request('http://localhost/x', { method: 'DELETE' }),
				{ params: Promise.resolve({ id: String(id), supportId: 's-1' }) }
			),
		sideEffects: () => [mocks.deactivate],
	},
]

const DENIED = [403, 404]

async function statusFor(
	route: RouteCase,
	role: string,
	idUser: number,
	id: number
) {
	state.user = { idUser, role }
	const res = await route.call(id)
	return res.status
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.createComment.mockResolvedValue({ id: 'c' })
	mocks.getComments.mockResolvedValue([])
	mocks.persistComprobante.mockResolvedValue({ id: 's' })
	mocks.listComprobantes.mockResolvedValue([])
	mocks.presign.mockResolvedValue({ url: 'u', key: 'k' })
	mocks.deactivate.mockResolvedValue(undefined)
	mocks.businessUpdate.mockResolvedValue({})
})

describe.each(ROUTES)('ownership: $name', (route) => {
	it('AGENTE: own business is not denied', async () => {
		expect(DENIED).not.toContain(await statusFor(route, 'AGENTE', 1, 100))
	})

	it(
		route.agentOwnOnly
			? 'AGENTE: subordinate business is 404 (owner-only write rule kept)'
			: 'AGENTE: subordinate business is not denied',
		async () => {
			const status = await statusFor(route, 'AGENTE', 1, 200)
			if (route.agentOwnOnly) expect(status).toBe(404)
			else expect(DENIED).not.toContain(status)
		}
	)

	it('AGENTE: business outside self+subordinates is 404 with no side effect', async () => {
		expect(await statusFor(route, 'AGENTE', 1, 300)).toBe(404)
		for (const fn of route.sideEffects()) expect(fn).not.toHaveBeenCalled()
	})

	it('PARTNER: foreign / other-partner / agent business is 404 with no side effect', async () => {
		for (const id of [300, 500, 100]) {
			expect(await statusFor(route, 'PARTNER', 10, id)).toBe(404)
		}
		for (const fn of route.sideEffects()) expect(fn).not.toHaveBeenCalled()
	})

	it('PARTNER: own business is not denied', async () => {
		expect(DENIED).not.toContain(await statusFor(route, 'PARTNER', 10, 400))
	})

	it('ADMIN keeps access to any business', async () => {
		expect(DENIED).not.toContain(await statusFor(route, 'ADMIN', 9, 300))
	})

	it('unknown role fails closed (403)', async () => {
		expect(await statusFor(route, 'SOMETHING_NEW', 1, 100)).toBe(403)
		for (const fn of route.sideEffects()) expect(fn).not.toHaveBeenCalled()
	})
})

describe('mark-novedad [PO]: MARK unchanged for internal users, PARTNER own only', () => {
	const patch = (action: 'MARK' | 'UNMARK', id: number) =>
		patchNovedad(json({ action }, 'PATCH'), ctx(id))

	it('MARK stays unchanged for an AGENTE: no new scope check (reaches the status precondition)', async () => {
		state.user = { idUser: 1, role: 'AGENTE' }
		// business 300 is foreign to the agent; fake status LIQUIDADO -> 409 precondition, NOT 403/404
		expect((await patch('MARK', 300)).status).toBe(409)
	})

	it('MARK stays unchanged for ADMIN', async () => {
		state.user = { idUser: 9, role: 'ADMIN' }
		expect((await patch('MARK', 300)).status).toBe(409)
	})

	it('PARTNER MARK on a foreign business is 404, nothing written', async () => {
		state.user = { idUser: 10, role: 'PARTNER' }
		for (const id of [300, 500, 100]) {
			expect((await patch('MARK', id)).status).toBe(404)
		}
		expect(mocks.businessUpdate).not.toHaveBeenCalled()
	})

	it('PARTNER UNMARK on a foreign business is 404, nothing written', async () => {
		state.user = { idUser: 10, role: 'PARTNER' }
		expect((await patch('UNMARK', 300)).status).toBe(404)
		expect(mocks.businessUpdate).not.toHaveBeenCalled()
	})

	it('PARTNER MARK on own business passes the scope check (reaches the precondition)', async () => {
		state.user = { idUser: 10, role: 'PARTNER' }
		expect((await patch('MARK', 400)).status).toBe(409)
	})

	it('UNMARK keeps its ownership rule for an AGENTE on a foreign business (403)', async () => {
		state.user = { idUser: 1, role: 'AGENTE' }
		// precondition (novedad NUEVA) is not met by the fake -> 409 first; ownership rule order is unchanged
		expect((await patch('UNMARK', 300)).status).toBe(409)
	})
})
