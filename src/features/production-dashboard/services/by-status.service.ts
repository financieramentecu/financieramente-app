/**
 * Service: Status Donut production aggregation.
 * Groups businesses by (status × idCurrency) using prisma.business.groupBy.
 * Returns StatusDonutRaw[] — no percentage, no fill (computed client-side).
 *
 * Business.status and Business.idCurrency are direct columns — no relation traversal needed.
 * Only in-scope statuses (VENTA_EFECTUADA, EMITIDO, FONDEADO) are returned.
 * Nulls and any other statuses are excluded at the DB level via IN filter.
 */

import { prisma } from '@/lib/prisma'
import { buildProductionWhereClause } from './ms-chart.service'
import {
  STATUS_DONUT_ALLOWED,
  type StatusDonutQueryParams,
  type StatusDonutRaw,
} from '../types/production-kpi.types'

/** The idCurrency value that represents COP in the database. */
const COP_CURRENCY_ID = 1

/**
 * Returns one row per (in-scope status × idCurrency) combination found in the
 * Business table for the given scope and filter params.
 *
 * Short-circuits on empty userIds — no DB query issued.
 * Status is filtered at DB level: only VENTA_EFECTUADA, EMITIDO, FONDEADO.
 */
export async function getBusinessesByStatusRaw(
  params: StatusDonutQueryParams
): Promise<StatusDonutRaw[]> {
  if (params.userIds.length === 0) return []

  // Respect the user's status filter, but never go outside the donut's in-scope
  // statuses. With no status filter applied, fall back to all allowed statuses.
  const { statuses } = params.appliedFilters
  const inScopeStatuses =
    statuses.length > 0
      ? statuses.filter((s): s is StatusDonutRaw['status'] =>
          (STATUS_DONUT_ALLOWED as readonly string[]).includes(s)
        )
      : [...STATUS_DONUT_ALLOWED]

  const rows = await prisma.business.groupBy({
    by: ['status', 'idCurrency'],
    where: {
      ...buildProductionWhereClause(params),
      status: { in: inScopeStatuses },
    },
    _count: { _all: true },
    _sum: { value: true },
  })

  return rows
    .filter(
      (r) =>
        r.status !== null &&
        (STATUS_DONUT_ALLOWED as readonly string[]).includes(r.status)
    )
    .map((r) => ({
      status: r.status as StatusDonutRaw['status'],
      count: r._count._all,
      currencyId: r.idCurrency ?? COP_CURRENCY_ID,
      totalValue: Number(r._sum.value ?? 0),
    }))
}
