/**
 * Service: Company Donut production aggregation.
 * Groups negocios by (Company × Currency) and joins with lookup tables.
 * Returns CompanyDonutRaw[] — no percentage, no fill (computed client-side).
 *
 * Business has no direct FK to Company — chain traversal:
 * Business → ProductPercentageCommission → ProductConfiguration → Product → Company
 * This rules out prisma.business.groupBy for this aggregation.
 * Pattern: findMany + in-memory reduce (mirrors heatmap.service.ts).
 */

import { prisma } from '@/lib/prisma'
import { buildProductionWhereClause } from './ms-chart.service'
import type { CompanyDonutQueryParams, CompanyDonutRaw } from '../types/production-kpi.types'

type BusinessRow = {
  idBusiness: number
  idCurrency: number | null
  value: { toNumber: () => number }
  productPercentageCommission: {
    productConfiguration: {
      product: {
        idCompany: number
        company: { idCompany: number; name: string }
      }
    }
  }
}

/**
 * Returns one row per (idCompany × idCurrency) combination found in the
 * Business table for the given scope and filter params.
 *
 * Short-circuits on empty userIds — no DB queries issued.
 * Company is fetched WITHOUT a `status` filter so deactivated companies with
 * historical negocios still surface (per spec: historical data preserved).
 */
export async function getCompanyDonutRaw(
  params: CompanyDonutQueryParams
): Promise<CompanyDonutRaw[]> {
  if (params.userIds.length === 0) return []

  const businesses = await (prisma.business.findMany({
    where: buildProductionWhereClause(params),
    select: {
      idBusiness: true,
      idCurrency: true,
      value: true,
      productPercentageCommission: {
        select: {
          productConfiguration: {
            select: {
              product: {
                select: {
                  idCompany: true,
                  company: { select: { idCompany: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  }) as unknown as Promise<BusinessRow[]>)

  if (businesses.length === 0) return []

  // Reduce into Map<`${companyId}-${currencyId}`, bucket>
  type Bucket = {
    companyId: number
    companyName: string
    currencyId: number
    count: number
    totalValue: number
  }

  const buckets = new Map<string, Bucket>()

  for (const b of businesses) {
    const product = b.productPercentageCommission.productConfiguration.product
    const companyId = product.idCompany
    const companyName = product.company.name
    const currencyId = b.idCurrency ?? 1
    const amount = b.value.toNumber()
    const key = `${companyId}-${currencyId}`

    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      existing.totalValue += amount
    } else {
      buckets.set(key, {
        companyId,
        companyName,
        currencyId,
        count: 1,
        totalValue: amount,
      })
    }
  }

  if (buckets.size === 0) return []

  // Collect unique currency ids for lookup
  const currencyIds = Array.from(new Set(Array.from(buckets.values()).map((b) => b.currencyId)))

  const currencies = await prisma.currency.findMany({
    where: { idCurrency: { in: currencyIds } },
    select: { idCurrency: true, name: true, symbol: true },
  })

  const currencyById = new Map(
    currencies.map((c) => [c.idCurrency, { name: c.name, symbol: c.symbol }])
  )

  return Array.from(buckets.values()).map((bucket) => {
    const currencyEntry = currencyById.get(bucket.currencyId)
    return {
      companyId: bucket.companyId,
      companyName: bucket.companyName,
      currencyId: bucket.currencyId,
      currencyName: currencyEntry?.name ?? `#${bucket.currencyId}`,
      currencySymbol: currencyEntry?.symbol ?? `#${bucket.currencyId}`,
      count: bucket.count,
      totalValue: bucket.totalValue,
    } satisfies CompanyDonutRaw
  })
}
