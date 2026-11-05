import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NextResponse } from 'next/server'

vi.mock('@/auth')
vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))
vi.mock('@/features/commission-discounts/services/commission-discount.service', () => ({
	listDiscounts: vi.fn(),
	findActiveByType: vi.fn(),
	createDiscount: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		DISCOUNT_CREATED: 'DISCOUNT_CREATED',
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

import { auth } from '@/auth'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import {
	listDiscounts,
	findActiveByType,
	createDiscount,
} from '@/features/commission-discounts/services/commission-discount.service'
import { NextResponse as NextResponseType } from 'next/server'

const mockAuth = vi.mocked(auth)
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
const mockListDiscounts = vi.mocked(listDiscounts)
const mockFindActiveByType = vi.mocked(findActiveByType)
const mockCreateDiscount = vi.mocked(createDiscount)
const mockNextResponseJson = vi.mocked(NextResponse.json)

beforeEach(() => {
	vi.clearAllMocks()
	mockNextResponseJson.mockImplementation((data: unknown, init?: { status?: number }) => ({
		json: () => Promise.resolve(data),
		status: init?.status ?? 200,
	}) as unknown as NextResponseType)
})

describe('GET /api/admin/discounts', () => {
	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)
		const request = new Request('http://localhost/api/admin/discounts')
		const response = await GET(request)
		expect(response.status).toBe(401)
	})

	it('returns { data: [] } with valid session and empty list', async () => {
		mockAuth.mockResolvedValue({ user: { id: '1', email: 'admin@test.com' } } as never)
		mockListDiscounts.mockResolvedValue([] as never)
		const request = new Request('http://localhost/api/admin/discounts')
		const response = await GET(request)
		const body = await response.json()
		expect(response.status).toBe(200)
		expect(body.data).toEqual([])
	})
})

describe('POST /api/admin/discounts', () => {
	const validBody = {
		name: 'Impuesto vigente',
		type: 'IMPUESTO',
		percentage: 12,
	}

	it('only allows the ADMIN role', async () => {
		allowAdmin()
		mockFindActiveByType.mockResolvedValue(null as never)
		mockCreateDiscount.mockResolvedValue({ id: 1, ...validBody } as never)
		await POST(
			new Request('http://localhost/api/admin/discounts', {
				method: 'POST',
				body: JSON.stringify(validBody),
			})
		)
		expect(mockRequireRole).toHaveBeenCalledWith([UserRole.ADMIN])
	})

	it('returns 403 and creates nothing for a non-admin role', async () => {
		denyWith(403)
		const response = await POST(
			new Request('http://localhost/api/admin/discounts', {
				method: 'POST',
				body: JSON.stringify(validBody),
			})
		)
		expect(response.status).toBe(403)
		expect(mockFindActiveByType).not.toHaveBeenCalled()
		expect(mockCreateDiscount).not.toHaveBeenCalled()
	})

	it('returns 401 when unauthenticated', async () => {
		denyWith(401)
		const request = new Request('http://localhost/api/admin/discounts', {
			method: 'POST',
			body: JSON.stringify(validBody),
		})
		const response = await POST(request)
		expect(response.status).toBe(401)
	})

	it('returns 400 when percentage is invalid', async () => {
		allowAdmin()
		const request = new Request('http://localhost/api/admin/discounts', {
			method: 'POST',
			body: JSON.stringify({ ...validBody, percentage: 0 }),
		})
		const response = await POST(request)
		expect(response.status).toBe(400)
	})

	it('returns 201 with created record when no ACTIVE exists for type', async () => {
		allowAdmin()
		mockFindActiveByType.mockResolvedValue(null as never)
		const created = { id: 1, ...validBody, status: 'ACTIVE', description: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1, updatedById: null }
		mockCreateDiscount.mockResolvedValue(created as never)
		const request = new Request('http://localhost/api/admin/discounts', {
			method: 'POST',
			body: JSON.stringify(validBody),
		})
		const response = await POST(request)
		expect(response.status).toBe(201)
	})

	it('returns 409 when ACTIVE discount already exists for same type', async () => {
		allowAdmin()
		mockFindActiveByType.mockResolvedValue({ id: 99, type: 'IMPUESTO', status: 'ACTIVE' } as never)
		const request = new Request('http://localhost/api/admin/discounts', {
			method: 'POST',
			body: JSON.stringify(validBody),
		})
		const response = await POST(request)
		expect(response.status).toBe(409)
	})
})
