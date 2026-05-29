/**
 * Service: Origin Donut production aggregation.
 * Groups negocios by (ClientOrigin × Currency) and joins with lookup tables.
 * Returns OriginDonutRaw[] — no percentage, no fill (computed client-side).
 */

import { prisma } from '@/lib/prisma'
import { buildProductionWhereClause } from './ms-chart.service'
import type { OriginDonutQueryParams, OriginDonutRaw } from '../types/production-kpi.types'

/**
 * Returns one row per (idClientOrigin × idCurrency) combination found in the
 * Business table for the given scope and filter params.
 *
 * Short-circuits on empty userIds — no DB queries issued.
 * ClientOrigin is fetched WITHOUT a `status` filter so deactivated origins with
 * historical negocios still surface (per spec: historical data preserved).
 */
export async function getOriginDonutRaw(
  params: OriginDonutQueryParams
): Promise<OriginDonutRaw[]> {
  if (params.userIds.length === 0) return []

  const rows = await prisma.business.groupBy({
    by: ['idClientOrigin', 'idCurrency'],
    where: buildProductionWhereClause(params),
    _count: { idBusiness: true },
    _sum: { value: true },
  })

  if (rows.length === 0) return []

  // Collect unique ids for the lookup queries
  const originIds = Array.from(new Set(rows.map((r) => r.idClientOrigin).filter((id): id is number => id !== null)))
  const currencyIds = Array.from(new Set(rows.map((r) => r.idCurrency).filter((id): id is number => id !== null)))

  // Parallel lookup — no status filter on clientOrigin (historical names preserved)
  const [origins, currencies] = await Promise.all([
    prisma.clientOrigin.findMany({
      where: { idClientOrigin: { in: originIds } },
      select: { idClientOrigin: true, name: true },
    }),
    prisma.currency.findMany({
      where: { idCurrency: { in: currencyIds } },
      select: { idCurrency: true, name: true, symbol: true },
    }),
  ])

  const originById = new Map(origins.map((o) => [o.idClientOrigin, o.name]))
  const currencyById = new Map(
    currencies.map((c) => [c.idCurrency, { name: c.name, symbol: c.symbol }])
  )

  return rows.map((r) => {
    const originId = r.idClientOrigin ?? 0
    const currencyId = r.idCurrency ?? 0
    const currencyEntry = currencyById.get(currencyId)

    return {
      originId,
      originName: originById.get(originId) ?? `Origen #${originId}`,
      currencyId,
      currencyName: currencyEntry?.name ?? `#${currencyId}`,
      currencySymbol: currencyEntry?.symbol ?? `#${currencyId}`,
      count: r._count.idBusiness ?? 0,
      totalValue: Number(r._sum.value ?? 0),
    } satisfies OriginDonutRaw
  })
}
