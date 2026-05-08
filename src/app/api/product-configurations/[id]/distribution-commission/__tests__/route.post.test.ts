import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../route'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'

const { findFirstPpc, createPpc, createManyCategories, findUniqueOrThrowPpc } =
	vi.hoisted(() => ({
		findFirstPpc: vi.fn(),
		createPpc: vi.fn(),
		createManyCategories: vi.fn(),
		findUniqueOrThrowPpc: vi.fn(),
	}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productPercentageCommission: {
			findFirst: findFirstPpc,
		},
		$transaction: (fn: (tx: unknown) => Promise<unknown>) =>
			fn({
				productPercentageCommission: {
					create: createPpc,
					findUniqueOrThrow: findUniqueOrThrowPpc,
				},
				productPercentageCommissionCategory: {
					createMany: createManyCategories,
				},
			}),
	},
}))

vi.mock('@/auth', () => ({
	auth: vi.fn().mockResolvedValue({
		user: { id: '1', email: 'admin@test.com' },
	}),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		DISTRIBUTION_COMMISSION_CREATED: 'DISTRIBUTION_COMMISSION_CREATED',
		DISTRIBUTION_COMMISSION_UPDATED: 'DISTRIBUTION_COMMISSION_UPDATED',
		DISTRIBUTION_COMMISSION_ACTIVATED: 'DISTRIBUTION_COMMISSION_ACTIVATED',
		DISTRIBUTION_COMMISSION_DEACTIVATED: 'DISTRIBUTION_COMMISSION_DEACTIVATED',
	},
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

vi.mock('@/features/distribution-commission/mappers/commission-rule.mapper', () => ({
	prismaCommissionRuleToDomain: vi.fn((data) => data),
	prismaCommissionRuleListToDomain: vi.fn((list) => list),
}))

const baseNewRule = {
	idProductPercentageCommission: 10,
	idProductConfiguration: 1,
	description: 'Regla nueva',
	active: true,
	hasPortfolio: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	productPercentageCommissionCategories: [],
}

const makeRequest = (body: unknown): NextRequest =>
	({
		json: async () => body,
		headers: new Headers(),
		nextUrl: new URL(
			'http://localhost:3000/api/product-configurations/1/distribution-commission'
		),
	}) as unknown as NextRequest

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('POST /api/product-configurations/[id]/distribution-commission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('crea regla exitosamente y dispara audit DISTRIBUTION_COMMISSION_CREATED', async () => {
		findFirstPpc.mockResolvedValueOnce(null)
		createPpc.mockResolvedValueOnce({ idProductPercentageCommission: 10 })
		createManyCategories.mockResolvedValueOnce({ count: 0 })
		findUniqueOrThrowPpc.mockResolvedValueOnce(baseNewRule)

		const req = makeRequest({
			description: 'Regla nueva',
			hasPortfolio: false,
			categories: [],
		})

		const res = await POST(req, makeParams('1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.data).toBeDefined()
		expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.DISTRIBUTION_COMMISSION_CREATED,
			})
		)
	})

	it('retorna 400 si ya existe una distribución activa', async () => {
		findFirstPpc.mockResolvedValueOnce({
			idProductPercentageCommission: 5,
			active: true,
		})

		const req = makeRequest({
			description: 'Regla nueva',
			hasPortfolio: false,
			categories: [],
		})

		const res = await POST(req, makeParams('1'))
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toMatch(/distribución activa/)
		expect(createPpc).not.toHaveBeenCalled()
	})

	it('sin sesión el handler sigue operando (sin guard de auth explícito)', async () => {
		const { auth } = await import('@/auth')
		vi.mocked(auth).mockResolvedValueOnce(null)

		findFirstPpc.mockResolvedValueOnce(null)
		createPpc.mockResolvedValueOnce({ idProductPercentageCommission: 11 })
		findUniqueOrThrowPpc.mockResolvedValueOnce(baseNewRule)

		const req = makeRequest({
			description: 'Regla nueva',
			hasPortfolio: false,
			categories: [],
		})

		// The POST route has no explicit auth guard — session is used only for audit log.
		const res = await POST(req, makeParams('1'))
		expect(res.status).toBe(200)
	})
})
