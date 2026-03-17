import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { FileImportService } from '@/features/load-file/services/file-import.service'
import { UserRole } from '@/features/auth/lib/roles'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/load-file/services/file-import.service', () => ({
	FileImportService: {
		listFileImports: vi.fn(),
	},
	PeriodCompletedError: class PeriodCompletedError extends Error {},
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

const mockAuth = vi.mocked(auth)
const mockListFileImports = vi.mocked(FileImportService.listFileImports)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeRequest(searchParams: Record<string, string> = {}): NextRequest {
	const url = new URL('http://localhost/api/carga-archivos/file-import')
	Object.entries(searchParams).forEach(([key, value]) =>
		url.searchParams.set(key, value)
	)
	return {
		nextUrl: url,
	} as unknown as NextRequest
}

describe('GET /api/carga-archivos/file-import', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) =>
				({
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				}) as unknown as NextResponse
		)
		mockAuth.mockResolvedValue({
			user: { id: '10', role: UserRole.AGENTE },
		} as unknown as Awaited<ReturnType<typeof auth>>)
		mockListFileImports.mockResolvedValue([])
	})

	describe('Zod validation — invalid params return 400', () => {
		it('month=0 → 400 response', async () => {
			const req = makeRequest({ month: '0' })
			const response = await GET(req)
			expect(response.status).toBe(400)
		})

		it('month=13 → 400 response', async () => {
			const req = makeRequest({ month: '13' })
			const response = await GET(req)
			expect(response.status).toBe(400)
		})

		it('year=2019 → 400 response', async () => {
			const req = makeRequest({ year: '2019' })
			const response = await GET(req)
			expect(response.status).toBe(400)
		})

		it('year=2101 → 400 response', async () => {
			const req = makeRequest({ year: '2101' })
			const response = await GET(req)
			expect(response.status).toBe(400)
		})
	})

	describe('valid params → forwarded to service', () => {
		it('month=1 passes as number 1 and returns 200', async () => {
			const req = makeRequest({ month: '1' })
			const response = await GET(req)

			expect(response.status).toBe(200)
			expect(mockListFileImports).toHaveBeenCalledWith(
				expect.objectContaining({ month: 1 })
			)
		})

		it('month=3 & year=2026 → service called with { month: 3, year: 2026 }', async () => {
			const req = makeRequest({ month: '3', year: '2026' })
			await GET(req)

			expect(mockListFileImports).toHaveBeenCalledWith(
				expect.objectContaining({ month: 3, year: 2026 })
			)
		})

		it('no filter params → service NOT called with month or year keys', async () => {
			const req = makeRequest({})
			await GET(req)

			const call = mockListFileImports.mock.calls[0][0]
			expect(call.month).toBeUndefined()
			expect(call.year).toBeUndefined()
		})

		it('all valid params forwarded to service', async () => {
			const req = makeRequest({
				month: '6',
				year: '2026',
				status: 'COMPLETED',
				search: 'test',
			})
			await GET(req)

			expect(mockListFileImports).toHaveBeenCalledWith(
				expect.objectContaining({
					month: 6,
					year: 2026,
					status: 'COMPLETED',
					search: 'test',
				})
			)
		})
	})

	describe('unauthenticated → 401', () => {
		it('returns 401 when session is null', async () => {
			mockAuth.mockResolvedValueOnce(null as unknown as Awaited<ReturnType<typeof auth>>)
			const req = makeRequest({})
			const response = await GET(req)
			expect(response.status).toBe(401)
		})
	})
})
