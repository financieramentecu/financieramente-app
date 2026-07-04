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
		const isAdmin =
			currentUser.role?.code === UserRole.ADMIN ||
			currentUser.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA ||
			currentUser.role?.code === UserRole.ANALISTA_SOPORTE
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

		const activeCurrencies = await prisma.currency.findMany({
			where: { active: true },
			select: { idCurrency: true, symbol: true, name: true },
		})

		const statuses = [
			BUSINESS_STATUS.VENTA_EFECTUADA,
			BUSINESS_STATUS.EMITIDO,
			BUSINESS_STATUS.FONDEADO,
		]

		const conditions: Prisma.Sql[] = [
			Prisma.sql`status IN (${Prisma.join(statuses)})`
		]

		if (userFilter && userFilter.length > 0) {
			conditions.push(Prisma.sql`id_user IN (${Prisma.join(userFilter)})`)
		}

		if (createdAtFilter?.gte && createdAtFilter?.lte) {
			conditions.push(Prisma.sql`created_at >= ${createdAtFilter.gte}::timestamp`)
			conditions.push(Prisma.sql`created_at <= ${createdAtFilter.lte}::timestamp`)
		}

		const whereSql = conditions.length > 0 
			? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
			: Prisma.empty

		// Using raw sql for aggregation to prevent Prisma N+1 issue on groupBy with IN clause
		const [groupResultsRaw, sinSoporte] = await Promise.all([
			prisma.$queryRaw<{status: string, idCurrency: number, _count: bigint, _sum: Prisma.Decimal | null}[]>`
				SELECT status, id_currency as "idCurrency", COUNT(id_business) as "_count", SUM(value) as "_sum"
				FROM business
				${whereSql}
				GROUP BY status, id_currency
			`,
			prisma.business.count({
				where: {
					status: BUSINESS_STATUS.EMITIDO,
					...(userFilter ? { idUser: { in: userFilter } } : {}),
					supports: { none: { status: true } },
				},
			}),
		])

		const groupResults = groupResultsRaw.map(g => ({
			status: g.status,
			idCurrency: Number(g.idCurrency),
			_count: { idBusiness: Number(g._count) },
			_sum: { value: g._sum ? Number(g._sum) : 0 }
		}))

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parseGroupValue = (rawValue: any): number => {
			const groupValue =
				rawValue !== null && rawValue !== undefined
					? typeof rawValue === 'object' && 'toNumber' in rawValue
						? (rawValue as { toNumber(): number }).toNumber()
						: Number(rawValue)
					: 0
			return isNaN(groupValue) ? 0 : groupValue
		}

		const extractKpi = (status: string): KpiCardData => {
			let count = 0
			let valueLocal = 0
			let valueForeign = 0

			const filteredGroups = groupResults.filter((g) => g.status === status)

			for (const group of filteredGroups) {
				const currency = activeCurrencies.find(
					(c) => c.idCurrency === group.idCurrency
				)
				count += group._count.idBusiness
				const safeValue = parseGroupValue(group._sum.value)

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
					if (group.idCurrency === 1) valueLocal += safeValue
					else if (group.idCurrency === 2) valueForeign += safeValue
					else valueLocal += safeValue
				}
			}

			return { count, totalCop: valueLocal, totalUsd: valueForeign }
		}

		const ventasEfectuadas = extractKpi(BUSINESS_STATUS.VENTA_EFECTUADA)
		const emitidosBase = extractKpi(BUSINESS_STATUS.EMITIDO)
		const fondeados = extractKpi(BUSINESS_STATUS.FONDEADO)

		const emitidos = { ...emitidosBase, sinSoporte }

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
