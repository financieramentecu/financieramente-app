import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      groupBy: vi.fn(),
    },
    clientOrigin: {
      findMany: vi.fn(),
    },
    currency: {
      findMany: vi.fn(),
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

// Mock ms-chart.service to isolate buildProductionWhereClause calls
vi.mock('../../services/ms-chart.service', () => ({
  buildProductionWhereClause: vi.fn(() => ({ idUser: { in: [] } })),
}))

import { prisma } from '@/lib/prisma'
import { buildProductionWhereClause } from '../../services/ms-chart.service'
import { getOriginDonutRaw } from '../../services/origin-donut.service'
import type { OriginDonutQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockGroupBy = vi.mocked(prisma.business.groupBy)
const mockClientOriginFindMany = vi.mocked(prisma.clientOrigin.findMany)
const mockCurrencyFindMany = vi.mocked(prisma.currency.findMany)
const mockBuildWhereClause = vi.mocked(buildProductionWhereClause)

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

function makeParams(userIds: number[], filters = defaultFilters): OriginDonutQueryParams {
  return { userIds, appliedFilters: filters }
}

describe('getOriginDonutRaw', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] immediately when userIds is empty — no Prisma call', async () => {
    const result = await getOriginDonutRaw(makeParams([]))
    expect(result).toEqual([])
    expect(mockGroupBy).not.toHaveBeenCalled()
    expect(mockClientOriginFindMany).not.toHaveBeenCalled()
    expect(mockCurrencyFindMany).not.toHaveBeenCalled()
  })

  it('returns [] when groupBy returns empty array', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    const result = await getOriginDonutRaw(makeParams([1]))
    expect(result).toEqual([])
    // Parallel fetches should NOT be called when groupBy returns empty
    expect(mockClientOriginFindMany).not.toHaveBeenCalled()
    expect(mockCurrencyFindMany).not.toHaveBeenCalled()
  })

  it('calls buildProductionWhereClause with the provided params', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    const params = makeParams([1, 2])
    await getOriginDonutRaw(params)
    expect(mockBuildWhereClause).toHaveBeenCalledWith(params)
  })

  it('calls groupBy with by: [idClientOrigin, idCurrency]', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    await getOriginDonutRaw(makeParams([1]))
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['idClientOrigin', 'idCurrency'] })
    )
  })

  it('joins groupBy results with origin names and currency symbols correctly', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 1, idCurrency: 2, _count: { idBusiness: 5 }, _sum: { value: 50000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([
      { idClientOrigin: 1, name: 'Referido' },
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getOriginDonutRaw(makeParams([1]))

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      originId: 1,
      originName: 'Referido',
      currencyId: 2,
      currencyName: 'Dólar',
      currencySymbol: 'USD',
      count: 5,
      totalValue: 50000,
    })
  })

  it('uses fallback name "Origen #N" when origin not found in lookup', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 99, idCurrency: 2, _count: { idBusiness: 3 }, _sum: { value: 30000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getOriginDonutRaw(makeParams([1]))

    expect(result[0].originName).toBe('Origen #99')
  })

  it('uses fallback symbol "#N" when currency not found in lookup', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 1, idCurrency: 99, _count: { idBusiness: 2 }, _sum: { value: 20000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([
      { idClientOrigin: 1, name: 'Digital' },
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([] as never)

    const result = await getOriginDonutRaw(makeParams([1]))

    expect(result[0].currencyName).toBe('#99')
    expect(result[0].currencySymbol).toBe('#99')
  })

  it('fetches clientOrigin WITHOUT a status filter (preserves historical origins)', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 1, idCurrency: 1, _count: { idBusiness: 1 }, _sum: { value: 10000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([] as never)
    mockCurrencyFindMany.mockResolvedValue([] as never)

    await getOriginDonutRaw(makeParams([1]))

    // Confirm that clientOrigin.findMany was NOT called with a status filter
    expect(mockClientOriginFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: expect.objectContaining({ status: expect.anything() }) })
    )
  })

  it('runs clientOrigin and currency fetches in parallel (both are called)', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 1, idCurrency: 2, _count: { idBusiness: 4 }, _sum: { value: 40000 } },
      { idClientOrigin: 2, idCurrency: 1, _count: { idBusiness: 2 }, _sum: { value: 20000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([
      { idClientOrigin: 1, name: 'A' },
      { idClientOrigin: 2, name: 'B' },
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 1, name: 'Peso colombiano', symbol: 'COP' },
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getOriginDonutRaw(makeParams([1]))

    expect(result).toHaveLength(2)
    expect(mockClientOriginFindMany).toHaveBeenCalledOnce()
    expect(mockCurrencyFindMany).toHaveBeenCalledOnce()
  })

  it('correctly scopes clientOrigin lookup to ids from groupBy results only', async () => {
    mockGroupBy.mockResolvedValue([
      { idClientOrigin: 5, idCurrency: 1, _count: { idBusiness: 1 }, _sum: { value: 10000 } },
      { idClientOrigin: 7, idCurrency: 2, _count: { idBusiness: 1 }, _sum: { value: 10000 } },
    ] as never)
    mockClientOriginFindMany.mockResolvedValue([] as never)
    mockCurrencyFindMany.mockResolvedValue([] as never)

    await getOriginDonutRaw(makeParams([1]))

    expect(mockClientOriginFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idClientOrigin: { in: expect.arrayContaining([5, 7]) } },
      })
    )
  })
})
