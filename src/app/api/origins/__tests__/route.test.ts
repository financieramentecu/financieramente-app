import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createClientOriginSchema } from '@/features/origin-client/lib/client-origin-schemas'
import {
	prismaClientOriginToClientOrigin,
	prismaClientOriginListToClientOrigins,
} from '@/features/origin-client/mappers/prisma.mapper'
import { logAuditEvent, AuditAction } from '@/lib/auth/audit-logger'
import { NextResponse } from 'next/server'
import { createMockPrismaClientOrigin } from '@/features/origin-client/__tests__/fixtures/mock-client-origin'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		clientOrigin: {
			count: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	},
}))
vi.mock('@/features/origin-client/lib/client-origin-schemas', () => ({
	createClientOriginSchema: {
		parse: vi.fn(),
	},
}))
vi.mock('@/features/origin-client/mappers/prisma.mapper')
vi.mock('@/lib/auth/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		CLIENT_ORIGIN_CREATED: 'CLIENT_ORIGIN_CREATED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/origins', () => {
	const mockPrismaCount = vi.mocked(prisma.clientOrigin.count)
	const mockPrismaFindMany = vi.mocked(prisma.clientOrigin.findMany)
	const mockPrismaClientOriginListToClientOrigins = vi.mocked(
		prismaClientOriginListToClientOrigins
	)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) => {
				return {
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				} as unknown as NextResponse
			}
		)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should list client origins successfully with default params', async () => {
		const mockOrigins = [
			createMockPrismaClientOrigin(),
			createMockPrismaClientOrigin({
				idClientOrigin: 2,
				name: 'Referido',
			}),
		]
		const mockFormattedOrigins = [
			{ idClientOrigin: 1, name: 'Propio' },
			{ idClientOrigin: 2, name: 'Referido' },
		]

		mockPrismaCount.mockResolvedValue(2)
		mockPrismaFindMany.mockResolvedValue(mockOrigins as never)
		mockPrismaClientOriginListToClientOrigins.mockReturnValue(
			mockFormattedOrigins as never
		)

		const request = new Request('http://localhost:3000/api/origins')
		const response = await GET(request)
		const responseData = await response.json()

		expect(mockPrismaCount).toHaveBeenCalled()
		expect(mockPrismaFindMany).toHaveBeenCalled()
		expect(responseData.data.origins).toEqual(mockFormattedOrigins)
		expect(responseData.data.pagination.total).toBe(2)
	})

	it('should handle search parameter', async () => {
		mockPrismaCount.mockResolvedValue(1)
		mockPrismaFindMany.mockResolvedValue([
			createMockPrismaClientOrigin(),
		] as never)
		mockPrismaClientOriginListToClientOrigins.mockReturnValue([
			{ idClientOrigin: 1, name: 'Propio' },
		] as never)

		const request = new Request(
			'http://localhost:3000/api/origins?search=Propio'
		)
		await GET(request)

		expect(mockPrismaFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					name: expect.objectContaining({
						contains: 'Propio',
					}),
				}),
			})
		)
	})
})

describe('POST /api/origins', () => {
	const mockPrismaFindFirst = vi.mocked(prisma.clientOrigin.findFirst)
	const mockPrismaCreate = vi.mocked(prisma.clientOrigin.create)
	const mockCreateClientOriginSchema = vi.mocked(createClientOriginSchema)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockPrismaClientOriginToClientOrigin = vi.mocked(
		prismaClientOriginToClientOrigin
	)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '1',
				email: 'test@example.com',
			},
		} as never)
	})

	it('should create client origin successfully', async () => {
		const mockData = {
			name: 'Propio',
			description: 'Origen propio',
			status: true,
		}
		const mockPrismaOrigin = createMockPrismaClientOrigin()
		const mockFormattedOrigin = {
			idClientOrigin: 1,
			name: 'Propio',
			description: 'Origen propio',
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		}

		mockCreateClientOriginSchema.parse.mockReturnValue(mockData)
		mockPrismaFindFirst.mockResolvedValue(null)
		mockPrismaCreate.mockResolvedValue(mockPrismaOrigin as never)
		mockPrismaClientOriginToClientOrigin.mockReturnValue(
			mockFormattedOrigin as never
		)

		const request = new Request('http://localhost:3000/api/origins', {
			method: 'POST',
			body: JSON.stringify(mockData),
		})

		const response = await POST(request)
		const responseData = await response.json()

		expect(mockPrismaCreate).toHaveBeenCalled()
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.CLIENT_ORIGIN_CREATED,
			})
		)
		expect(responseData.data).toEqual(mockFormattedOrigin)
		expect(response.status).toBe(201)
	})

	it('should reject duplicate name', async () => {
		const mockData = {
			name: 'Propio',
			status: true,
		}
		const existingOrigin = createMockPrismaClientOrigin()

		mockCreateClientOriginSchema.parse.mockReturnValue(mockData)
		mockPrismaFindFirst.mockResolvedValue(existingOrigin as never)

		const request = new Request('http://localhost:3000/api/origins', {
			method: 'POST',
			body: JSON.stringify(mockData),
		})

		const response = await POST(request)
		const responseData = await response.json()

		expect(responseData.error).toBe('Ya existe un origen con este nombre')
		expect(response.status).toBe(409)
		expect(mockPrismaCreate).not.toHaveBeenCalled()
	})
})
