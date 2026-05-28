import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      groupBy: vi.fn(),
    },
  },
}))

// Mock bogota-date-range to avoid timezone complexities in tests
vi.mock('@/features/negocios/lib/bogota-date-range', () => ({
  parseBogotaInclusiveUtcRange: vi.fn((start: string, end: string) => ({
    gte: new Date(`${start}T00:00:00.000Z`),
    lte: new Date(`${end}T23:59:59.999Z`),
  })),
}))

import { prisma } from '@/lib/prisma'
import { getMsChartRaw, buildProductionWhereClause } from '../../services/ms-chart.service'
import type { MsChartQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockGroupBy = vi.mocked(prisma.business.groupBy)

const defaultFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function makeParams(userIds: number[], filters = defaultFilters): MsChartQueryParams {
  return { userIds, appliedFilters: filters }
}

describe('getMsChartRaw', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] immediately when userIds is empty — no Prisma call', async () => {
    const result = await getMsChartRaw(makeParams([]))
    expect(result).toEqual([])
    expect(mockGroupBy).not.toHaveBeenCalled()
  })

  it('calls groupBy with by: [idUser, idCurrency]', async () => {
    mockGroupBy.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    await getMsChartRaw(makeParams([1, 2]))

    expect(mockGroupBy).toHaveBeenCalledOnce()
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['idUser', 'idCurrency'] })
    )
  })

  it('maps Prisma rows to MsKpiRaw correctly with Number() coercion', async () => {
    mockGroupBy.mockResolvedValue([
      {
        idUser: 1,
        idCurrency: 1,
        _sum: { value: { toNumber: () => 500000, toString: () => '500000' } },
        _count: { idBusiness: 5 },
      },
      {
        idUser: 1,
        idCurrency: 2,
        _sum: { value: { toNumber: () => 10000, toString: () => '10000' } },
        _count: { idBusiness: 2 },
      },
    ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const result = await getMsChartRaw(makeParams([1]))

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      userId: 1,
      currencyType: 1,
      totalAmount: expect.any(Number),
      count: 5,
    })
    expect(result[1]).toEqual({
      userId: 1,
      currencyType: 2,
      totalAmount: expect.any(Number),
      count: 2,
    })
  })

  it('handles null _sum.value and null idCurrency correctly', async () => {
    mockGroupBy.mockResolvedValue([
      {
        idUser: 5,
        idCurrency: null,
        _sum: { value: null },
        _count: { idBusiness: 0 },
      },
    ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const result = await getMsChartRaw(makeParams([5]))

    expect(result[0].totalAmount).toBe(0)
    expect(result[0].currencyType).toBe(1) // falls back to COP_CURRENCY_ID
    expect(result[0].count).toBe(0)
  })
})

describe('buildProductionWhereClause', () => {
  it('includes idUser IN filter from userIds', () => {
    const where = buildProductionWhereClause(makeParams([1, 2, 3]))
    expect(where.idUser).toEqual({ in: [1, 2, 3] })
  })

  it('includes createdAt filter when dateRange has valid dates', () => {
    const filters: DashboardAppliedFilters = {
      ...defaultFilters,
      dateRange: { start: new Date('2026-01-01'), end: new Date('2026-03-31') },
    }
    const where = buildProductionWhereClause(makeParams([1], filters))
    expect(where.createdAt).toBeDefined()
  })

  it('excludes optional filter keys when arrays are empty', () => {
    const where = buildProductionWhereClause(makeParams([1], defaultFilters))
    expect((where as Record<string, unknown>).status).toBeUndefined()
    expect((where as Record<string, unknown>).user).toBeUndefined()
    expect((where as Record<string, unknown>).term).toBeUndefined()
    expect((where as Record<string, unknown>).idClientOrigin).toBeUndefined()
    expect((where as Record<string, unknown>).productPercentageCommission).toBeUndefined()
    expect((where as Record<string, unknown>).buyPeriodicity).toBeUndefined()
  })

  it('includes status filter when statuses array is non-empty', () => {
    const filters: DashboardAppliedFilters = { ...defaultFilters, statuses: ['EMITIDO'] }
    const where = buildProductionWhereClause(makeParams([1], filters)) as Record<string, unknown>
    expect(where.status).toEqual({ in: ['EMITIDO'] })
  })

  it('includes user.idCategory filter when categoryIds is non-empty', () => {
    const filters: DashboardAppliedFilters = { ...defaultFilters, categoryIds: [3, 4] }
    const where = buildProductionWhereClause(makeParams([1], filters)) as Record<string, unknown>
    expect(where.user).toEqual({ idCategory: { in: [3, 4] } })
  })
})
