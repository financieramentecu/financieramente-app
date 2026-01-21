/**
 * API Route: /api/negocios/stats
 * GET - Obtener estadísticas de negocios agrupadas por currency
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	BusinessStatsResponse,
	StatusStats,
	MonthlyData,
	StatsCurrencyInfo,
	StatsByCurrency,
} from '@/features/negocios/types/business-api.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/lib/auth/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

/**
 * GET /api/negocios/stats
 * Obtiene estadísticas de negocios efectuados y emitidos agrupadas por currency
 */
export async function GET(): Promise<
	NextResponse<ApiResponse<BusinessStatsResponse>>
> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Obtener todas las currencies activas desde la BD
		const activeCurrencies = await prisma.currency.findMany({
			where: { active: true },
		})

		// Mapear currencies para la respuesta
		const currencies: StatsCurrencyInfo[] = activeCurrencies.map((c) => ({
			symbol: c.symbol || c.name,
			name: c.name,
		}))

		// Determinar filtro según rol
		const isAgent = currentUser.role?.code === UserRole.AGENTE
		const userFilter = isAgent ? currentUser.idUser : undefined

		// Calcular estadísticas para cada estado agrupadas por currency
		const [efectuadosStats, emitidosStats] = await Promise.all([
			calculateStatsForStatusByCurrency(
				BUSINESS_STATUS.VENTA_EFECTUADA,
				activeCurrencies,
				userFilter
			),
			calculateStatsForStatusByCurrency(
				BUSINESS_STATUS.EMITIDO,
				activeCurrencies,
				userFilter
			),
		])

		return NextResponse.json({
			data: {
				currencies,
				efectuados: efectuadosStats,
				emitidos: emitidosStats,
			},
		})
	} catch (error) {
		console.error('Error al obtener estadísticas:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}

/**
 * Tipo para currency desde Prisma
 */
interface CurrencyRecord {
	idCurrency: number
	name: string
	symbol: string | null
	active: boolean
	createdAt: Date
	updatedAt: Date
}

/**
 * Calcula estadísticas para un estado específico agrupadas por currency
 */
async function calculateStatsForStatusByCurrency(
	status: string,
	currencies: CurrencyRecord[],
	userFilter?: number
): Promise<StatsByCurrency> {
	const result: StatsByCurrency = {}

	// Calcular stats para cada currency
	await Promise.all(
		currencies.map(async (currency) => {
			const currencyKey = currency.symbol || currency.name
			const stats = await calculateStatsForCurrency(
				status,
				currency.idCurrency,
				userFilter
			)
			result[currencyKey] = stats
		})
	)

	return result
}

/**
 * Calcula estadísticas para un estado y currency específicos
 */
async function calculateStatsForCurrency(
	status: string,
	idCurrency: number,
	userFilter?: number
): Promise<StatusStats> {
	const whereClause: Prisma.BusinessWhereInput = {
		status,
		idCurrency,
		...(userFilter ? { idUser: userFilter } : {}),
	}

	// 1. Total de valores
	const totalResult = await prisma.business.aggregate({
		where: whereClause,
		_sum: { value: true },
	})
	const totalValue = Number(totalResult._sum.value || 0)

	// 2. Obtener datos mensuales (últimos 12 meses)
	const monthlyData = await getMonthlyData(status, idCurrency, userFilter)

	// 3. Calcular crecimiento vs mes anterior
	const growthPercentage = calculateGrowth(monthlyData)

	// 4. Extraer valores del mes actual y anterior
	const totalMonth =
		monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].totalValue : 0
	const totalLastMonth =
		monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].totalValue : 0

	return {
		totalValue,
		totalMonth,
		totalLastMonth,
		monthlyData,
		growthPercentage,
	}
}

/**
 * Obtiene datos mensuales agregados para los últimos 12 meses
 */
async function getMonthlyData(
	status: string,
	idCurrency: number,
	userFilter?: number
): Promise<MonthlyData[]> {
	const twelveMonthsAgo = new Date()
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
	twelveMonthsAgo.setDate(1)
	twelveMonthsAgo.setHours(0, 0, 0, 0)

	// Obtener negocios filtrados por currency
	const businesses = await prisma.business.findMany({
		where: {
			status,
			idCurrency,
			createdAt: { gte: twelveMonthsAgo },
			...(userFilter ? { idUser: userFilter } : {}),
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

	// Agrupar por mes manualmente
	const monthlyMap = new Map<string, number>()

	businesses.forEach((b) => {
		const month = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, '0')}`
		const current = monthlyMap.get(month) || 0
		monthlyMap.set(month, current + Number(b.value))
	})

	// Convertir a array y ordenar
	const result: MonthlyData[] = Array.from(monthlyMap.entries())
		.map(([month, totalValue]) => ({ month, totalValue }))
		.sort((a, b) => a.month.localeCompare(b.month))

	// Rellenar meses faltantes con 0
	const filledResult = fillMissingMonths(result, twelveMonthsAgo)

	return filledResult
}

/**
 * Rellena los meses faltantes con valor 0
 */
function fillMissingMonths(
	data: MonthlyData[],
	startDate: Date
): MonthlyData[] {
	const result: MonthlyData[] = []
	const dataMap = new Map(data.map((d) => [d.month, d.totalValue]))

	const current = new Date(startDate)
	const now = new Date()

	while (current <= now) {
		const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
		result.push({
			month,
			totalValue: dataMap.get(month) || 0,
		})
		current.setMonth(current.getMonth() + 1)
	}

	return result
}

/**
 * Calcula el porcentaje de crecimiento comparado con el mes anterior
 */
function calculateGrowth(monthlyData: MonthlyData[]): number {
	if (monthlyData.length < 2) {
		return 0
	}

	const currentMonth = monthlyData[monthlyData.length - 1].totalValue
	const previousMonth = monthlyData[monthlyData.length - 2].totalValue

	if (previousMonth === 0) {
		return currentMonth > 0 ? 100 : 0
	}

	return ((currentMonth - previousMonth) / previousMonth) * 100
}
