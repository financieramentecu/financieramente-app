import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../stats/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	mockUserWithRole,
	mockAgentUser,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import type { MonthlyData } from '@/features/negocios/types/business-api.types'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		currency: {
			findMany: vi.fn(),
		},
		business: {
			aggregate: vi.fn(),
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/negocios/stats', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaCurrencyFindMany = vi.mocked(prisma.currency.findMany)
	const mockPrismaAggregate = vi.mocked(prisma.business.aggregate)
	const mockPrismaFindMany = vi.mocked(prisma.business.findMany)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	// Mock currencies por defecto
	const mockCurrencies = [
		{
			idCurrency: 1,
			name: 'Peso Colombiano',
			symbol: 'COP',
			active: true,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
		{
			idCurrency: 2,
			name: 'Dólar Americano',
			symbol: 'USD',
			active: true,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
	]

	beforeEach(() => {
		vi.clearAllMocks()
		// Mock por defecto de currencies activas
		mockPrismaCurrencyFindMany.mockResolvedValue(mockCurrencies as never)
		// Mock por defecto de NextResponse.json para retornar el objeto directamente
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

	describe('Happy Path - Usuario Admin', () => {
		it('debe obtener estadísticas sin filtro de usuario para admin', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description:
						'Acceso total a todos los módulos y configuración del sistema',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockEfectuadosAggregate = {
				_sum: { value: 635000000 },
			}

			const mockEmitidosAggregate = {
				_sum: { value: 325000000 },
			}

			// Mock de datos mensuales - últimos 2 meses para simplificar
			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockEfectuadosBusinesses = [
				{
					createdAt: lastMonth,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 60000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			const mockEmitidosBusinesses = [
				{
					createdAt: lastMonth,
					value: 25000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 30000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockEfectuadosAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados (sin datos)
				.mockResolvedValueOnce(mockEmitidosAggregate as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos (sin datos)
			mockPrismaFindMany
				.mockResolvedValueOnce(mockEfectuadosBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados (sin datos)
				.mockResolvedValueOnce(mockEmitidosBusinesses as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos (sin datos)

			const response = await GET()
			const responseData = await response.json()

			// Verificar llamadas
			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockPrismaCurrencyFindMany).toHaveBeenCalledWith({
				where: { active: true },
			})
			// Aggregate se llama por cada currency y estado (2 currencies × 2 estados = 4)
			expect(mockPrismaAggregate).toHaveBeenCalledTimes(4)

			// Verificar que no se aplica filtro de usuario
			expect(mockPrismaAggregate).toHaveBeenCalledWith({
				where: {
					status: BUSINESS_STATUS.VENTA_EFECTUADA,
					idCurrency: 1, // COP
				},
				_sum: { value: true },
			})

			// Verificar estructura de respuesta
			expect(responseData).toHaveProperty('data')
			expect(responseData.data).toHaveProperty('currencies')
			expect(responseData.data).toHaveProperty('efectuados')
			expect(responseData.data).toHaveProperty('emitidos')

			// Verificar currencies
			expect(Array.isArray(responseData.data.currencies)).toBe(true)
			expect(responseData.data.currencies).toHaveLength(2)
			expect(responseData.data.currencies[0]).toHaveProperty('symbol')
			expect(responseData.data.currencies[0]).toHaveProperty('name')

			// Verificar estructura agrupada por currency
			expect(responseData.data.efectuados).toHaveProperty('COP')
			expect(responseData.data.efectuados).toHaveProperty('USD')
			expect(responseData.data.emitidos).toHaveProperty('COP')
			expect(responseData.data.emitidos).toHaveProperty('USD')

			// Verificar estructura de StatusStats para COP efectuados
			expect(responseData.data.efectuados.COP).toHaveProperty('totalValue')
			expect(responseData.data.efectuados.COP).toHaveProperty('totalMonth')
			expect(responseData.data.efectuados.COP).toHaveProperty('totalLastMonth')
			expect(responseData.data.efectuados.COP).toHaveProperty('monthlyData')
			expect(responseData.data.efectuados.COP).toHaveProperty(
				'growthPercentage'
			)

			// Verificar valores COP
			expect(responseData.data.efectuados.COP.totalValue).toBe(635000000)
			expect(responseData.data.emitidos.COP.totalValue).toBe(325000000)

			// Verificar que USD tiene valores en 0 (sin datos)
			expect(responseData.data.efectuados.USD.totalValue).toBe(0)
			expect(responseData.data.emitidos.USD.totalValue).toBe(0)
		})
	})

	describe('Happy Path - Usuario Agente', () => {
		it('debe obtener estadísticas filtradas por idUser para agente', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
					name: 'Agent User',
				},
			}

			const mockAggregate = {
				_sum: { value: 150000000 },
			}

			const mockBusinesses = [
				{
					createdAt: new Date(),
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			await GET()

			// Verificar que se aplica filtro de usuario y currency
			expect(mockPrismaAggregate).toHaveBeenCalledWith({
				where: {
					status: BUSINESS_STATUS.VENTA_EFECTUADA,
					idUser: mockAgentUser.idUser,
					idCurrency: 1, // COP
				},
				_sum: { value: true },
			})

			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {
					status: BUSINESS_STATUS.VENTA_EFECTUADA,
					createdAt: expect.any(Object),
					idUser: mockAgentUser.idUser,
					idCurrency: 1, // COP
				},
				select: {
					createdAt: true,
					value: true,
					currency: {
						select: {
							idCurrency: true,
							symbol: true,
						},
					},
				},
			})
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando la sesión no tiene email', async () => {
			mockAuth.mockResolvedValue({
				user: {
					name: 'User',
				},
			} as never)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando session.user es null', async () => {
			mockAuth.mockResolvedValue({} as never)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
		})
	})

	describe('Casos de Usuario No Encontrado', () => {
		it('debe retornar 404 cuando el usuario no existe', async () => {
			const mockSession = {
				user: {
					email: 'nonexistent@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'nonexistent@example.com'
			)
		})
	})

	describe('Casos de Datos Vacíos', () => {
		it('debe retornar estadísticas con valores en 0 cuando no hay negocios', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockEmptyAggregate = {
				_sum: { value: null },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockEmptyAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Verificar estructura agrupada por currency
			expect(responseData.data.efectuados).toHaveProperty('COP')
			expect(responseData.data.efectuados).toHaveProperty('USD')
			expect(responseData.data.efectuados.COP.totalValue).toBe(0)
			expect(responseData.data.efectuados.COP.totalMonth).toBe(0)
			expect(responseData.data.efectuados.COP.totalLastMonth).toBe(0)
			expect(responseData.data.efectuados.COP.growthPercentage).toBe(0)
			expect(Array.isArray(responseData.data.efectuados.COP.monthlyData)).toBe(
				true
			)
		})

		it('debe retornar totalValue 0 cuando _sum.value es null', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockNullAggregate = {
				_sum: { value: null },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockNullAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: null } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.totalValue).toBe(0)
			expect(responseData.data.efectuados.USD.totalValue).toBe(0)
			expect(responseData.data.emitidos.COP.totalValue).toBe(0)
			expect(responseData.data.emitidos.USD.totalValue).toBe(0)
		})
	})

	describe('Casos de Cálculo de Crecimiento', () => {
		it('debe calcular crecimiento positivo correctamente', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 100000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 50000000, // Mes anterior
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 60000000, // Mes actual (20% más)
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Crecimiento esperado: ((60M - 50M) / 50M) * 100 = 20%
			expect(responseData.data.efectuados.COP.growthPercentage).toBeCloseTo(
				20,
				1
			)
		})

		it('debe calcular crecimiento negativo correctamente', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 100000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 60000000, // Mes anterior
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 50000000, // Mes actual (menor)
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Crecimiento esperado: ((50M - 60M) / 60M) * 100 = -16.67%
			expect(responseData.data.efectuados.COP.growthPercentage).toBeCloseTo(
				-16.67,
				1
			)
		})

		it('debe retornar 100% cuando mes anterior es 0 y mes actual > 0', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 50000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 0, // Mes anterior en 0
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 50000000, // Mes actual con valor
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.growthPercentage).toBe(100)
		})

		it('debe retornar 0% cuando ambos meses son 0', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 0 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 0,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 0,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.growthPercentage).toBe(0)
		})

		it('debe retornar 100% cuando solo hay un mes de datos (mes anterior rellenado con 0)', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 50000000 },
			}

			const currentDate = new Date()

			const mockBusinesses = [
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Cuando solo hay un mes de datos, fillMissingMonths rellena meses anteriores con 0
			// Por lo tanto, el crecimiento es 100% (de 0 a valor positivo)
			expect(responseData.data.efectuados.COP.growthPercentage).toBe(100)
		})
	})

	describe('Casos de Datos Mensuales', () => {
		it('debe rellenar meses faltantes con valor 0', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 50000000 },
			}

			// Solo datos de hace 3 meses y el mes actual
			const currentDate = new Date()
			const threeMonthsAgo = new Date(currentDate)
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

			const mockBusinesses = [
				{
					createdAt: threeMonthsAgo,
					value: 25000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 25000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			const monthlyData: MonthlyData[] =
				responseData.data.efectuados.COP.monthlyData

			// Debe tener aproximadamente 12 meses (puede variar según el día del mes)
			expect(monthlyData.length).toBeGreaterThanOrEqual(3)
			expect(monthlyData.length).toBeLessThanOrEqual(13)

			// Verificar que los meses sin datos tienen valor 0
			const monthsWithData = monthlyData.filter((d) => d.totalValue > 0)
			expect(monthsWithData.length).toBeGreaterThanOrEqual(2)
		})

		it('debe ordenar datos mensuales cronológicamente', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 150000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)
			const twoMonthsAgo = new Date(currentDate)
			twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

			const mockBusinesses = [
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: twoMonthsAgo,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: lastMonth,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			const monthlyData: MonthlyData[] =
				responseData.data.efectuados.COP.monthlyData

			// Verificar que está ordenado
			for (let i = 1; i < monthlyData.length; i++) {
				expect(monthlyData[i].month >= monthlyData[i - 1].month).toBe(true)
			}
		})

		it('debe agregar correctamente valores de múltiples negocios en el mismo mes', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 150000000 },
			}

			const currentDate = new Date()

			const mockBusinesses = [
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			const monthlyData: MonthlyData[] =
				responseData.data.efectuados.COP.monthlyData
			const currentMonthData = monthlyData[monthlyData.length - 1]

			// Debe sumar los 3 valores: 50M + 50M + 50M = 150M
			expect(currentMonthData.totalValue).toBe(150000000)
		})

		it('debe usar formato correcto YYYY-MM para los meses', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 50000000 },
			}

			const currentDate = new Date()

			const mockBusinesses = [
				{
					createdAt: currentDate,
					value: 50000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			const monthlyData: MonthlyData[] =
				responseData.data.efectuados.COP.monthlyData

			// Verificar formato YYYY-MM
			monthlyData.forEach((data) => {
				expect(data.month).toMatch(/^\d{4}-\d{2}$/)
			})
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando aggregate falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			mockPrismaAggregate.mockRejectedValue(new Error('Database error'))

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando currency.findMany falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			mockPrismaCurrencyFindMany.mockRejectedValue(
				new Error('Currency query error')
			)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando findMany falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 100000000 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			mockPrismaAggregate.mockResolvedValue(mockAggregate as never)
			mockPrismaFindMany.mockRejectedValue(new Error('Database query error'))

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando getCurrentUserByEmail lanza error', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockRejectedValue(
				new Error('Database connection error')
			)

			const response = await GET()
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})

	describe('Casos de Valores Edge', () => {
		it('debe manejar correctamente valores decimales', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 1234567.89 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.totalValue).toBe(1234567.89)
		})

		it('debe manejar correctamente valores muy grandes', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 999999999999 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.totalValue).toBe(999999999999)
		})

		it('debe calcular correctamente totalMonth y totalLastMonth', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 200000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 80000000, // totalLastMonth
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 120000000, // totalMonth
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.totalMonth).toBe(120000000)
			expect(responseData.data.efectuados.COP.totalLastMonth).toBe(80000000)
		})

		it('debe retornar 0 para totalMonth cuando no hay datos mensuales', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 0 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			expect(responseData.data.efectuados.COP.totalMonth).toBe(0)
			expect(responseData.data.efectuados.COP.totalLastMonth).toBe(0)
		})
	})

	describe('Verificación de Estructura de Respuesta', () => {
		it('debe incluir todas las currencies activas en la respuesta, incluso sin datos', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado) - todos en 0
			mockPrismaAggregate
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce([] as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Verificar que currencies se incluye en la respuesta
			expect(responseData.data).toHaveProperty('currencies')
			expect(Array.isArray(responseData.data.currencies)).toBe(true)
			expect(responseData.data.currencies.length).toBe(2)

			// Verificar que cada currency tiene symbol y name
			responseData.data.currencies.forEach(
				(currency: { symbol: string; name: string }) => {
					expect(currency).toHaveProperty('symbol')
					expect(currency).toHaveProperty('name')
					expect(typeof currency.symbol).toBe('string')
					expect(typeof currency.name).toBe('string')
				}
			)

			// Verificar que todas las currencies están en efectuados y emitidos
			const currencySymbols = responseData.data.currencies.map(
				(c: { symbol: string }) => c.symbol
			)
			currencySymbols.forEach((symbol: string) => {
				expect(responseData.data.efectuados).toHaveProperty(symbol)
				expect(responseData.data.emitidos).toHaveProperty(symbol)
				// Verificar que tienen estructura StatusStats incluso sin datos
				expect(responseData.data.efectuados[symbol]).toHaveProperty(
					'totalValue'
				)
				expect(responseData.data.efectuados[symbol]).toHaveProperty(
					'monthlyData'
				)
				expect(responseData.data.emitidos[symbol]).toHaveProperty('totalValue')
				expect(responseData.data.emitidos[symbol]).toHaveProperty('monthlyData')
			})
		})

		it('debe retornar estructura completa de BusinessStatsResponse', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAggregate = {
				_sum: { value: 100000000 },
			}

			const currentDate = new Date()
			const lastMonth = new Date(currentDate)
			lastMonth.setMonth(lastMonth.getMonth() - 1)

			const mockBusinesses = [
				{
					createdAt: lastMonth,
					value: 40000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
				{
					createdAt: currentDate,
					value: 60000000,
					currency: {
						idCurrency: 1,
						symbol: 'COP',
					},
				},
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockUserWithRole)
			// Mock aggregate por currency (COP y USD para cada estado)
			mockPrismaAggregate
				.mockResolvedValueOnce(mockAggregate as never) // COP efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD efectuados
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // COP emitidos
				.mockResolvedValueOnce({ _sum: { value: 0 } } as never) // USD emitidos
			mockPrismaFindMany
				.mockResolvedValueOnce(mockBusinesses as never) // COP efectuados
				.mockResolvedValueOnce([] as never) // USD efectuados
				.mockResolvedValueOnce([] as never) // COP emitidos
				.mockResolvedValueOnce([] as never) // USD emitidos

			const response = await GET()
			const responseData = await response.json()

			// Verificar estructura completa
			expect(responseData).toHaveProperty('data')
			expect(responseData.data).toHaveProperty('currencies')
			expect(responseData.data).toHaveProperty('efectuados')
			expect(responseData.data).toHaveProperty('emitidos')

			// Verificar currencies
			expect(Array.isArray(responseData.data.currencies)).toBe(true)
			expect(responseData.data.currencies.length).toBeGreaterThan(0)

			// Verificar estructura agrupada por currency
			expect(responseData.data.efectuados).toHaveProperty('COP')
			expect(responseData.data.efectuados).toHaveProperty('USD')
			expect(responseData.data.emitidos).toHaveProperty('COP')
			expect(responseData.data.emitidos).toHaveProperty('USD')

			// Verificar estructura de efectuados COP
			expect(responseData.data.efectuados.COP).toHaveProperty('totalValue')
			expect(responseData.data.efectuados.COP).toHaveProperty('totalMonth')
			expect(responseData.data.efectuados.COP).toHaveProperty('totalLastMonth')
			expect(responseData.data.efectuados.COP).toHaveProperty('monthlyData')
			expect(responseData.data.efectuados.COP).toHaveProperty(
				'growthPercentage'
			)
			expect(Array.isArray(responseData.data.efectuados.COP.monthlyData)).toBe(
				true
			)

			// Verificar estructura de emitidos COP
			expect(responseData.data.emitidos.COP).toHaveProperty('totalValue')
			expect(responseData.data.emitidos.COP).toHaveProperty('totalMonth')
			expect(responseData.data.emitidos.COP).toHaveProperty('totalLastMonth')
			expect(responseData.data.emitidos.COP).toHaveProperty('monthlyData')
			expect(responseData.data.emitidos.COP).toHaveProperty('growthPercentage')
			expect(Array.isArray(responseData.data.emitidos.COP.monthlyData)).toBe(
				true
			)

			// Verificar tipos
			expect(typeof responseData.data.efectuados.COP.totalValue).toBe('number')
			expect(typeof responseData.data.efectuados.COP.totalMonth).toBe('number')
			expect(typeof responseData.data.efectuados.COP.totalLastMonth).toBe(
				'number'
			)
			expect(typeof responseData.data.efectuados.COP.growthPercentage).toBe(
				'number'
			)
		})
	})
})
