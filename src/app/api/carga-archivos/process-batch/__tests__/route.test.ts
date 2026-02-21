import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '@/app/dashboard/carga-archivos/lib/file-types'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { findBusinessByContract } from '@/app/dashboard/carga-archivos/lib/business-matcher'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		commissionConfiguration: {
			findFirst: vi.fn(),
		},
		settlementCommission: {
			create: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		IMPORT_ERROR: 'IMPORT_ERROR',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('@/app/dashboard/carga-archivos/lib/business-matcher', () => ({
	findBusinessByContract: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('POST /api/carga-archivos/process-batch', () => {
	const mockAuth = vi.mocked(auth)
	const mockFindFileImport = vi.mocked(prisma.fileImport.findFirst)
	const mockUpdateFileImport = vi.mocked(prisma.fileImport.update)
	const mockCreateSettlement = vi.mocked(prisma.settlementCommission.create)
	const mockFindConfig = vi.mocked(prisma.commissionConfiguration.findFirst)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockFindBusiness = vi.mocked(findBusinessByContract)
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

	it('logs audit entry and marks record as error for invalid numeric values', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', email: 'test@example.com' },
		} as unknown as Awaited<ReturnType<typeof auth>>)
		mockFindFileImport.mockResolvedValue({
			idFileImport: 1,
			idUser: 1,
		} as never)
		mockFindConfig.mockResolvedValue(null)
		mockUpdateFileImport.mockResolvedValue({} as never)
		mockCreateSettlement.mockResolvedValue({} as never)
		mockFindBusiness.mockResolvedValue(null)

		const headers = [
			'Cto',
			'Desde',
			'Hasta',
			'Tipo de Comision',
			'Base',
			'Com',
		]
		const records = [
			{
				rowNumber: 2,
				data: {
					Cto: '123',
					Desde: '2024-01-01',
					Hasta: '2024-12-31',
					'Tipo de Comision': 'BASE',
					Base: 'abc',
					Com: '1000',
				},
				isValid: true,
				errors: [],
			},
		]

		const request = new Request(
			'http://localhost/api/carga-archivos/process-batch',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fileImportId: 1,
					records,
					headers,
					fileType: FILE_TYPES.VOLUNTARIA,
					batchSize: 10,
				}),
			}
		)

		const response = await POST(request as unknown as NextRequest)
		const responseData = await response.json()

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'IMPORT_ERROR',
			})
		)
		expect(mockCreateSettlement).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: 'ERROR',
				}),
			})
		)
		expect(response.status).toBe(200)
		expect(responseData.summary.error).toBe(1)
	})
})
