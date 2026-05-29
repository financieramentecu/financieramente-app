/**
 * Service: MS Bar Chart production aggregation.
 * Provides buildProductionWhereClause (shared helper) and getMsChartRaw.
 */

import { prisma } from '@/lib/prisma'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'
import type { MsKpiRaw, MsChartQueryParams } from '../types/production-kpi.types'

/** The idCurrency value that represents COP in the database. */
const COP_CURRENCY_ID = 1

/**
 * Builds the Prisma where clause shared by both getProductionKpiRaw and getMsChartRaw.
 * Pure function — no Prisma calls, no side effects.
 * Extracted to prevent filter drift between the two services.
 */
export function buildProductionWhereClause(params: MsChartQueryParams) {
  const { userIds, appliedFilters } = params
  const {
    dateRange,
    statuses,
    categoryIds,
    companyIds,
    productIds,
    originIds,
    plazos,
    periodicidades,
  } = appliedFilters

  let createdAtFilter: { gte: Date; lte: Date } | undefined
  if (dateRange.start && dateRange.end) {
    try {
      const startIso = dateRange.start.toISOString().slice(0, 10)
      const endIso = dateRange.end.toISOString().slice(0, 10)
      createdAtFilter = parseBogotaInclusiveUtcRange(startIso, endIso)
    } catch {
      // Invalid date range — skip filter
    }
  }

  return {
    idUser: { in: [...userIds] },
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
    // plazos maps to Business.term (policy duration in years)
    ...(plazos.length > 0 ? { term: { in: plazos } } : {}),
    // originIds maps directly
    ...(originIds.length > 0 ? { idClientOrigin: { in: originIds } } : {}),
    // categoryIds: Business → User → idCategory
    ...(categoryIds.length > 0 ? { user: { idCategory: { in: categoryIds } } } : {}),
    // productIds: Business → productPercentageCommission → productConfiguration → idProduct
    ...(productIds.length > 0 ? {
      productPercentageCommission: {
        productConfiguration: { idProduct: { in: productIds } },
      },
    } : {}),
    // companyIds: Business → productPercentageCommission → productConfiguration → product → idCompany
    ...(companyIds.length > 0 ? {
      productPercentageCommission: {
        productConfiguration: { product: { idCompany: { in: companyIds } } },
      },
    } : {}),
    // periodicidades: Business → buyPeriodicity → name
    ...(periodicidades.length > 0 ? {
      buyPeriodicity: { name: { in: periodicidades } },
    } : {}),
  }
}

/**
 * Returns per-user, per-currency production aggregation for the given scope.
 * One row per (userId × idCurrency) pair found in the Business table.
 * Short-circuits on empty userIds — no DB query issued.
 */
export async function getMsChartRaw(
  params: MsChartQueryParams
): Promise<MsKpiRaw[]> {
  if (params.userIds.length === 0) return []

  const rows = await prisma.business.groupBy({
    by: ['idUser', 'idCurrency'],
    where: buildProductionWhereClause(params),
    _sum: { value: true },
    _count: { idBusiness: true },
  })

  return rows.map((row) => ({
    userId: row.idUser,
    currencyType: row.idCurrency ?? COP_CURRENCY_ID,
    totalAmount: Number(row._sum.value ?? 0),
    count: row._count.idBusiness ?? 0,
  }))
}
