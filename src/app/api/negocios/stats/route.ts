/**
 * API Route: /api/negocios/stats
 * GET - Obtener estadísticas de negocios para el dashboard del Coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	CoachKpiResponse,
	KpiCardData,
} from '@/features/negocios/types/business-api.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getSubordinateUserIds } from '@/features/negocios/services/user-hierarchy.service'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<CoachKpiResponse>>> {
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

		// Visibility scope:
		// ADMIN → no idUser filter (see all)
		// All other roles → hierarchical scope: [self, ...subordinates]
		const isAdmin = currentUser.role?.code === UserRole.ADMIN
		let userFilter: number[] | undefined

		if (!isAdmin) {
			const subordinates = await getSubordinateUserIds(prisma, currentUser.idUser)
			userFilter = [currentUser.idUser, ...subordinates]
		}

		// Fechas opcionales
		const { searchParams } = new URL(req.url)
		const dateFrom = searchParams.get('dateFrom') || undefined
		const dateTo = searchParams.get('dateTo') || undefined

		let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined
		if (dateFrom && dateTo) {
			try {
				const { gte, lte } = parseBogotaInclusiveUtcRange(dateFrom, dateTo)
				createdAtFilter = { gte, lte }
			} catch (err) {
				// Invalid dates just log and ignore or return 400
				console.warn('Fechas inválidas para KPIs de creación:', err)
			}
		}

		const [ventasEfectuadas, emitidos, fondeados] = await Promise.all([
			calculateAggregateForStatus(BUSINESS_STATUS.VENTA_EFECTUADA, userFilter, createdAtFilter),
			calculateAggregateForStatus(BUSINESS_STATUS.EMITIDO, userFilter, createdAtFilter),
			calculateAggregateForStatus(
				BUSINESS_STATUS.FONDEADO,
				userFilter,
				createdAtFilter
			),
		])

		return NextResponse.json({
			data: { ventasEfectuadas, emitidos, fondeados },
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
 * Calcula estadísticas agregadas para un estado agrupando por moneda
 */
async function calculateAggregateForStatus(
	status: string,
	userFilter?: number[],
	createdAtFilter?: Prisma.DateTimeFilter
): Promise<KpiCardData> {
	const whereClause: Prisma.BusinessWhereInput = {
		status,
		...(userFilter ? { idUser: { in: userFilter } } : {}),
		...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
	}

	const groupResult = await prisma.business.groupBy({
		by: ['idCurrency'],
		where: whereClause,
		_count: { idBusiness: true },
		_sum: { value: true },
	})

	let count = 0
	let valueLocal = 0
	let valueForeign = 0

	const activeCurrencies = await prisma.currency.findMany({
		where: { active: true },
		select: { idCurrency: true, symbol: true, name: true },
	})

	for (const group of groupResult) {
		const currency = activeCurrencies.find(
			(c) => c.idCurrency === group.idCurrency
		)
		const groupCount = group._count.idBusiness
		const rawValue = group._sum.value
		const groupValue =
			rawValue !== null && rawValue !== undefined
				? typeof rawValue === 'object' && 'toNumber' in rawValue
					? (rawValue as { toNumber(): number }).toNumber()
					: Number(rawValue)
				: 0
		const safeValue = isNaN(groupValue) ? 0 : groupValue

		count += groupCount

		const sym = (currency?.symbol ?? '').toUpperCase()
		const nam = (currency?.name ?? '').toUpperCase()
		const isLocal =
			sym.includes('COP') || nam.includes('COP') || sym.includes('PESO')
		const isForeign =
			sym.includes('USD') ||
			nam.includes('DOLLAR') ||
			sym.includes('US$') ||
			nam.includes('DOLAR')

		if (isLocal) {
			valueLocal += safeValue
		} else if (isForeign) {
			valueForeign += safeValue
		} else {
			// Fallback por ID: moneda 1 = local, moneda 2 = extranjera
			if (group.idCurrency === 1) valueLocal += safeValue
			else if (group.idCurrency === 2) valueForeign += safeValue
			else valueLocal += safeValue // última opción: asumir local
		}
	}

	return { count, totalCop: valueLocal, totalUsd: valueForeign }
}
