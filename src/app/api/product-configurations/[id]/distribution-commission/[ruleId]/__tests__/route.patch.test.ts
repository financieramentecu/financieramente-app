import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'

const { findFirstPpc, updatePpc, countBusiness } = vi.hoisted(() => ({
	findFirstPpc: vi.fn(),
	updatePpc: vi.fn(),
	countBusiness: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productPercentageCommission: {
			findFirst: findFirstPpc,
			update: updatePpc,
		},
		business: {
			count: countBusiness,
		},
	},
}))

vi.mock('@/lib/auth/nextauth')

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
}))

const makeRequest = (body: unknown): NextRequest =>
	({
		json: async () => body,
		headers: new Headers(),
	}) as unknown as NextRequest

const makeParams = (id: string, ruleId: string) =>
	({ params: Promise.resolve({ id, ruleId }) })

const mockAuth = vi.mocked(auth)

describe('PATCH /api/product-configurations/[id]/distribution-commission/[ruleId]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAuth.mockResolvedValue({
			user: { id: '1', email: 'admin@test.com', role: UserRole.ADMIN },
		} as never)
	})

	it('retorna 401 sin sesión', async () => {
		mockAuth.mockResolvedValueOnce(null as never)
		const req = makeRequest({ active: false })
		const res = await PATCH(req, makeParams('1', '1'))
		expect(res.status).toBe(401)
		expect(updatePpc).not.toHaveBeenCalled()
	})

	it('retorna 403 para un rol sin autoridad de ADMIN', async () => {
		mockAuth.mockResolvedValueOnce({
			user: { id: '2', email: 'agente@test.com', role: UserRole.AGENTE },
		} as never)
		const req = makeRequest({ active: false })
		const res = await PATCH(req, makeParams('1', '1'))
		expect(res.status).toBe(403)
		expect(updatePpc).not.toHaveBeenCalled()
	})

	it('desactivar regla sin negocios asociados retorna 200 y audit DEACTIVATED', async () => {
		findFirstPpc.mockResolvedValueOnce({
			idProductPercentageCommission: 1,
			active: true,
		})
		countBusiness.mockResolvedValueOnce(0)

		const updatedRule = {
			idProductPercentageCommission: 1,
			idProductConfiguration: 1,
			description: 'Regla A',
			active: false,
			hasPortfolio: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			productPercentageCommissionCategories: [],
		}
		updatePpc.mockResolvedValueOnce(updatedRule)

		const req = makeRequest({ active: false })
		const res = await PATCH(req, makeParams('1', '1'))

		expect(res.status).toBe(200)
		expect(updatePpc).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idProductPercentageCommission: 1 },
				data: { active: false },
			})
		)
		expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.DISTRIBUTION_COMMISSION_DEACTIVATED,
			})
		)
	})

	it('activar regla retorna 200 y audit ACTIVATED', async () => {
		// findFirst for existing rule check
		findFirstPpc.mockResolvedValueOnce({
			idProductPercentageCommission: 1,
			active: false,
		})
		// findFirst for "another active" check — none found
		findFirstPpc.mockResolvedValueOnce(null)

		const updatedRule = {
			idProductPercentageCommission: 1,
			idProductConfiguration: 1,
			description: 'Regla A',
			active: true,
			hasPortfolio: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			productPercentageCommissionCategories: [],
		}
		updatePpc.mockResolvedValueOnce(updatedRule)

		const req = makeRequest({ active: true })
		const res = await PATCH(req, makeParams('1', '1'))

		expect(res.status).toBe(200)
		expect(updatePpc).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idProductPercentageCommission: 1 },
				data: { active: true },
			})
		)
		expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.DISTRIBUTION_COMMISSION_ACTIVATED,
			})
		)
	})

	it('409 si existen negocios activos al desactivar', async () => {
		findFirstPpc.mockResolvedValueOnce({
			idProductPercentageCommission: 1,
			active: true,
		})
		countBusiness.mockResolvedValueOnce(3)

		const req = makeRequest({ active: false })
		const res = await PATCH(req, makeParams('1', '1'))
		const json = await res.json()

		expect(res.status).toBe(409)
		expect(json.error).toMatch(/negocios asociados/)
		expect(updatePpc).not.toHaveBeenCalled()
	})

	it('404 si la regla no existe', async () => {
		findFirstPpc.mockResolvedValueOnce(null)

		const req = makeRequest({ active: false })
		const res = await PATCH(req, makeParams('1', '99'))
		const json = await res.json()

		expect(res.status).toBe(404)
		expect(json.error).toMatch(/no encontrada/)
	})
})
