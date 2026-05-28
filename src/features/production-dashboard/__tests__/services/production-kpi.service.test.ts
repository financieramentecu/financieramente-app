import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getProductionKpiRaw } from '../../services/production-kpi.service'
import type { ProductionKpiQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockGroupBy = vi.mocked(prisma.business.groupBy)

const defaultFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function makeParams(userIds: number[], filters = defaultFilters): ProductionKpiQueryParams {
  return { userIds, appliedFilters: filters }
}

describe('getProductionKpiRaw', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero ProductionKpiRaw without calling DB when userIds is empty', async () => {
    const result = await getProductionKpiRaw(makeParams([]))
    expect(result).toEqual({
      totalCop: 0,
      totalForeignUsd: 0,
      nationalCount: 0,
      foreignCount: 0,
    })
    expect(mockGroupBy).not.toHaveBeenCalled()
  })

  it('calls groupBy with userIds filter and returns classified result', async () => {
    mockGroupBy.mockResolvedValue([
      { idCurrency: 1, _count: { idBusiness: 3 }, _sum: { value: { toNumber: () => 8100000 } } },
      { idCurrency: 2, _count: { idBusiness: 2 }, _sum: { value: { toNumber: () => 500 } } },
    ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const result = await getProductionKpiRaw(makeParams([10, 11, 12]))

    expect(mockGroupBy).toHaveBeenCalledOnce()
    const callArgs = mockGroupBy.mock.calls[0][0] as { where: { idUser?: { in: number[] } } }
    expect(callArgs.where.idUser).toEqual({ in: [10, 11, 12] })

    expect(result.totalCop).toBe(8100000)
    expect(result.totalForeignUsd).toBe(500)
    expect(result.nationalCount).toBe(3)
    expect(result.foreignCount).toBe(2)
  })

  it('includes date range filter in where clause when provided', async () => {
    mockGroupBy.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const filtersWithDates: DashboardAppliedFilters = {
      ...defaultFilters,
      dateRange: { start: new Date('2025-03-01'), end: new Date('2025-03-31') },
    }
    await getProductionKpiRaw(makeParams([5], filtersWithDates))

    const callArgs = mockGroupBy.mock.calls[0][0] as { where: { createdAt?: unknown } }
    expect(callArgs.where.createdAt).toBeDefined()
  })

  it('handles categoryIds filter in where clause', async () => {
    mockGroupBy.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const filtersWithCategory: DashboardAppliedFilters = {
      ...defaultFilters,
      categoryIds: [5, 6],
    }
    await getProductionKpiRaw(makeParams([1], filtersWithCategory))

    const callArgs = mockGroupBy.mock.calls[0][0] as { where: { user?: unknown } }
    expect(callArgs.where.user).toEqual({ idCategory: { in: [5, 6] } })
  })

  it('handles productIds filter in where clause', async () => {
    mockGroupBy.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const filtersWithProduct: DashboardAppliedFilters = {
      ...defaultFilters,
      productIds: [10, 11],
    }
    await getProductionKpiRaw(makeParams([1], filtersWithProduct))

    const callArgs = mockGroupBy.mock.calls[0][0] as { where: { productPercentageCommission?: unknown } }
    expect(callArgs.where.productPercentageCommission).toEqual({
      productConfiguration: { idProduct: { in: [10, 11] } },
    })
  })

  it('handles Decimal sum values correctly', async () => {
    mockGroupBy.mockResolvedValue([
      { idCurrency: 1, _count: { idBusiness: 1 }, _sum: { value: null } },
    ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)

    const result = await getProductionKpiRaw(makeParams([1]))
    expect(result.totalCop).toBe(0)
    expect(result.nationalCount).toBe(1)
  })
})
