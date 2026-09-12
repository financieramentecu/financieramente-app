/**
 * KPI aggregation for ABA-MFUND: ABA Total, Fondeado, Emitido, ticket promedio.
 * COP only; empty hierarchy → zeros (no Prisma).
 */

import { prisma } from '@/lib/prisma'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { buildAbaMfundWhere } from '../lib/build-aba-mfund-where'
import { coerceDecimal } from '../lib/coerce-decimal'
import { computeTicketPromedio } from '../lib/compute-ticket-promedio'
import type {
	AbaMfundKpiMetric,
	AbaMfundKpiQuery,
	AbaMfundKpis,
} from '../types/aba-mfund.types'
import type { Prisma } from '@prisma/client'

const ZERO_METRIC: AbaMfundKpiMetric = { sum: 0, count: 0 }

const ZERO_KPIS: AbaMfundKpis = {
	abaTotal: ZERO_METRIC,
	fondeado: ZERO_METRIC,
	emitido: ZERO_METRIC,
	ticketPromedio: 0,
}

async function aggregateMetric(
	where: Prisma.BusinessWhereInput
): Promise<AbaMfundKpiMetric> {
	const result = await prisma.business.aggregate({
		where,
		_sum: { value: true },
		_count: { idBusiness: true },
	})

	return {
		sum: coerceDecimal(result._sum.value),
		count: result._count.idBusiness,
	}
}

/**
 * Computes COP KPIs for the shared ABA-MFUND WHERE.
 * Empty `userIds` short-circuits with zeros (no Prisma leak).
 */
export async function getAbaMfundKpis(
	query: AbaMfundKpiQuery
): Promise<AbaMfundKpis> {
	const { filters } = query

	if (filters.userIds.length === 0) {
		return ZERO_KPIS
	}

	const baseWhere = buildAbaMfundWhere(filters)

	const [abaTotal, fondeado, emitido] = await Promise.all([
		aggregateMetric(baseWhere),
		aggregateMetric({
			AND: [baseWhere, { status: BUSINESS_STATUS.FONDEADO }],
		}),
		aggregateMetric({
			AND: [baseWhere, { status: BUSINESS_STATUS.EMITIDO }],
		}),
	])

	return {
		abaTotal,
		fondeado,
		emitido,
		ticketPromedio: computeTicketPromedio(abaTotal.sum, abaTotal.count),
	}
}
