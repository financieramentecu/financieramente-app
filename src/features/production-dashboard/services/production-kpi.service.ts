/**
 * Service: Production KPI aggregation.
 * Runs a single Prisma groupBy over Business.idCurrency and delegates
 * classification to currency-classifier.ts.
 */

import { prisma } from '@/lib/prisma'
import { parseBogotaInclusiveUtcRange } from '@/features/negocios/lib/bogota-date-range'
import { classifyGroupByResults } from '../lib/currency-classifier'
import type { ProductionKpiQueryParams, ProductionKpiRaw } from '../types/production-kpi.types'

/** The idCurrency value that represents COP in the database. */
const COP_CURRENCY_ID = 1

const ZERO_RESULT: ProductionKpiRaw = {
  totalCop: 0,
  totalForeignUsd: 0,
  nationalCount: 0,
  foreignCount: 0,
}

/**
 * Returns raw KPI aggregation for the given user scope and filters.
 * Short-circuits immediately with zeros if userIds is empty (no DB query).
 */
export async function getProductionKpiRaw(
  params: ProductionKpiQueryParams
): Promise<ProductionKpiRaw> {
  const { userIds, appliedFilters } = params

  if (userIds.length === 0) {
    return { ...ZERO_RESULT }
  }

  const { dateRange, categoryIds, productIds, companyIds, originIds, statuses, plazos, periodicidades } = appliedFilters

  // Build date range filter
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

  const where = {
    idUser: { in: userIds },
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

  const groups = await prisma.business.groupBy({
    by: ['idCurrency'],
    where,
    _count: { idBusiness: true },
    _sum: { value: true },
  })

  return classifyGroupByResults(
    groups as Parameters<typeof classifyGroupByResults>[0],
    COP_CURRENCY_ID
  )
}
