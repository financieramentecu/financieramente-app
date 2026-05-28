/**
 * Service: Production KPI aggregation.
 * Runs a single Prisma groupBy over Business.idCurrency and delegates
 * classification to currency-classifier.ts.
 */

import { prisma } from '@/lib/prisma'
import { classifyGroupByResults } from '../lib/currency-classifier'
import { buildProductionWhereClause } from './ms-chart.service'
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
  const { userIds } = params

  if (userIds.length === 0) {
    return { ...ZERO_RESULT }
  }

  const where = buildProductionWhereClause(params)

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
