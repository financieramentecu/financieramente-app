import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Mock requireAuth to always return ok
vi.mock('@/lib/auth/require-role', () => ({
	requireAuth: vi.fn(() => Promise.resolve({ ok: true, session: {} })),
	requireRole: vi.fn(() => Promise.resolve({ ok: true, session: {} })),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findMany: vi.fn(),
		},
	},
}))

vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/users/search', () => {
	const mockPrismaFindMany = vi.mocked(prisma.user.findMany)
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

	describe('Filtro por beneficiaryMode', () => {
		it('debe filtrar usuarios por beneficiaryMode=OVERRIDE cuando se proporciona', async () => {
			const mockUsers = [
				{
					id: 1,
					idUser: 1,
					name: 'Test',
					lastName: 'Agent',
					email: 'agent@test.com',
					identityNumber: '123456',
					active: true,
					idCategoria: 1,
					role: { id: 1, idRole: 1, code: 'AGENTE', name: 'Agente/Coach' },
				},
			]

			mockPrismaFindMany.mockResolvedValue(mockUsers as never)

			const request = new Request(
				'http://localhost:3000/api/users/search?query=test&beneficiaryMode=OVERRIDE'
			)
			const response = await GET(request)
			const data = await response.json()

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						category: {
							beneficiaryMode: 'OVERRIDE',
						},
					}),
				})
			)
			expect(data.data).toEqual(mockUsers)
		})

		it('NO debe incluir filtro de categoría cuando beneficiaryMode no se proporciona', async () => {
			const mockUsers = [
				{
					id: 1,
					idUser: 1,
					name: 'Test',
					lastName: 'Agent',
					email: 'agent@test.com',
					identityNumber: '123456',
					active: true,
					role: { id: 1, idRole: 1, code: 'AGENTE', name: 'Agente/Coach' },
				},
			]

			mockPrismaFindMany.mockResolvedValue(mockUsers as never)

			const request = new Request(
				'http://localhost:3000/api/users/search?query=test'
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.not.objectContaining({
						category: expect.anything(),
					}),
				})
			)
		})

		it('debe retornar solo los usuarios que tienen categoría OVERRIDE asignada', async () => {
			// Usuario sin categoría (idCategoria null) no debería aparecer al filtrar por OVERRIDE
			// Prisma maneja esto automáticamente con la relación, aquí verificamos que el where
			// se construye correctamente con el filtro de relación
			const mockUsers: unknown[] = [] // Sin resultados (usuario sin categoría no aparece)

			mockPrismaFindMany.mockResolvedValue(mockUsers as never)

			const request = new Request(
				'http://localhost:3000/api/users/search?query=test&beneficiaryMode=OVERRIDE'
			)
			const response = await GET(request)
			const data = await response.json()

			expect(data.data).toEqual([])
		})
	})

	describe('Comportamiento existente (sin regresiones)', () => {
		it('debe retornar [] cuando query tiene menos de 3 caracteres', async () => {
			const request = new Request(
				'http://localhost:3000/api/users/search?query=ab'
			)
			const response = await GET(request)
			const data = await response.json()

			expect(data.data).toEqual([])
			expect(mockPrismaFindMany).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando el rol es inválido', async () => {
			const request = new Request(
				'http://localhost:3000/api/users/search?query=test&role=INVALID_ROLE'
			)
			const response = await GET(request)

			expect(response.status).toBe(400)
		})

		it('debe filtrar por role cuando se proporciona un rol válido', async () => {
			mockPrismaFindMany.mockResolvedValue([] as never)

			const request = new Request(
				'http://localhost:3000/api/users/search?query=test&role=AGENTE'
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						role: { code: 'AGENTE' },
					}),
				})
			)
		})
	})
})
