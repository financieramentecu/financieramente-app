import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextResponse } from 'next/server'

vi.mock('@/auth')
vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))
vi.mock('@/features/commission-discounts/services/commission-discount.service', () => ({
	findDiscountById: vi.fn(),
	inactivateDiscount: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		DISCOUNT_INACTIVATED: 'DISCOUNT_INACTIVATED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status ?? 200,
		})),
	},
}))

import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import {
	findDiscountById,
	inactivateDiscount,
} from '@/features/commission-discounts/services/commission-discount.service'
import { NextResponse as NextResponseType } from 'next/server'

const mockRequireRole = vi.mocked(requireRole)

function allowAdmin() {
	mockRequireRole.mockResolvedValue({
		ok: true,
		session: { user: { id: '1', email: 'admin@test.com', role: UserRole.ADMIN } },
	} as never)
}

function denyWith(status: number) {
	mockRequireRole.mockResolvedValue({
		ok: false,
		response: { status, json: () => Promise.resolve({ error: 'denied' }) },
	} as never)
}
const mockFindDiscountById = vi.mocked(findDiscountById)
const mockInactivateDiscount = vi.mocked(inactivateDiscount)
const mockNextResponseJson = vi.mocked(NextResponse.json)

beforeEach(() => {
	vi.clearAllMocks()
	mockNextResponseJson.mockImplementation((data: unknown, init?: { status?: number }) => ({
		json: () => Promise.resolve(data),
		status: init?.status ?? 200,
	}) as unknown as NextResponseType)
})

const params = { params: Promise.resolve({ id: '1' }) }

describe('POST /api/admin/discounts/[id]/inactivate', () => {
	it('only allows the ADMIN role', async () => {
		allowAdmin()
		mockFindDiscountById.mockResolvedValue({ id: 1, status: 'ACTIVE' } as never)
		mockInactivateDiscount.mockResolvedValue({ id: 1, status: 'INACTIVE' } as never)
		await POST(
			new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' }),
			params
		)
		expect(mockRequireRole).toHaveBeenCalledWith([UserRole.ADMIN])
	})

	it('returns 403 and inactivates nothing for a non-admin role', async () => {
		denyWith(403)
		const response = await POST(
			new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' }),
			params
		)
		expect(response.status).toBe(403)
		expect(mockFindDiscountById).not.toHaveBeenCalled()
		expect(mockInactivateDiscount).not.toHaveBeenCalled()
	})

	it('returns 401 when unauthenticated', async () => {
		denyWith(401)
		const request = new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' })
		const response = await POST(request, params)
		expect(response.status).toBe(401)
	})

	it('returns 404 when discount not found', async () => {
		allowAdmin()
		mockFindDiscountById.mockResolvedValue(null as never)
		const request = new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' })
		const response = await POST(request, params)
		expect(response.status).toBe(404)
	})

	it('returns 400 when discount is already INACTIVE', async () => {
		allowAdmin()
		mockFindDiscountById.mockResolvedValue({ id: 1, status: 'INACTIVE' } as never)
		const request = new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' })
		const response = await POST(request, params)
		expect(response.status).toBe(400)
	})

	it('returns 200 with { status: INACTIVE } for ACTIVE discount', async () => {
		allowAdmin()
		mockFindDiscountById.mockResolvedValue({ id: 1, status: 'ACTIVE' } as never)
		mockInactivateDiscount.mockResolvedValue({ id: 1, status: 'INACTIVE' } as never)
		const request = new Request('http://localhost/api/admin/discounts/1/inactivate', { method: 'POST' })
		const response = await POST(request, params)
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data.status).toBe('INACTIVE')
	})
})
