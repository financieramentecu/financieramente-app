import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
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
import { getCompanyDonutRaw } from '../../services/company-donut.service'
import type { CompanyDonutQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockFindMany = vi.mocked(prisma.business.findMany)
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

function makeParams(userIds: number[], filters = defaultFilters): CompanyDonutQueryParams {
  return { userIds, appliedFilters: filters }
}

/** Build a minimal business row for mocking */
function makeBusinessRow(
  companyId: number,
  companyName: string,
  currencyId: number,
  value: number
) {
  return {
    idBusiness: Math.random(),
    idCurrency: currencyId,
    value: { toNumber: () => value },
    productPercentageCommission: {
      productConfiguration: {
        product: {
          idCompany: companyId,
          company: { idCompany: companyId, name: companyName },
        },
      },
    },
  }
}

describe('getCompanyDonutRaw', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] immediately when userIds is empty — no Prisma call', async () => {
    const result = await getCompanyDonutRaw(makeParams([]))
    expect(result).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockCurrencyFindMany).not.toHaveBeenCalled()
  })

  it('returns [] when findMany returns empty array', async () => {
    mockFindMany.mockResolvedValue([] as never)
    const result = await getCompanyDonutRaw(makeParams([1]))
    expect(result).toEqual([])
    expect(mockCurrencyFindMany).not.toHaveBeenCalled()
  })

  it('calls buildProductionWhereClause with the provided params', async () => {
    mockFindMany.mockResolvedValue([] as never)
    const params = makeParams([1, 2])
    await getCompanyDonutRaw(params)
    expect(mockBuildWhereClause).toHaveBeenCalledWith(params)
  })

  it('aggregates two businesses from the same (company × currency) into one row', async () => {
    mockFindMany.mockResolvedValue([
      makeBusinessRow(1, 'SKANDIA', 2, 50000),
      makeBusinessRow(1, 'SKANDIA', 2, 30000),
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getCompanyDonutRaw(makeParams([1]))

    expect(result).toHaveLength(1)
    expect(result[0].companyId).toBe(1)
    expect(result[0].count).toBe(2)
    expect(result[0].totalValue).toBe(80000)
  })

  it('produces separate rows for different (company × currency) pairs', async () => {
    mockFindMany.mockResolvedValue([
      makeBusinessRow(1, 'SKANDIA', 2, 50000),
      makeBusinessRow(2, 'TRINITY', 1, 20000),
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 1, name: 'Peso colombiano', symbol: 'COP' },
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getCompanyDonutRaw(makeParams([1]))

    expect(result).toHaveLength(2)
    const skandia = result.find((r) => r.companyId === 1)
    const trinity = result.find((r) => r.companyId === 2)
    expect(skandia).toBeDefined()
    expect(trinity).toBeDefined()
    expect(skandia!.currencySymbol).toBe('USD')
    expect(trinity!.currencySymbol).toBe('COP')
  })

  it('joins results with currency name and symbol correctly', async () => {
    mockFindMany.mockResolvedValue([
      makeBusinessRow(1, 'SKANDIA', 2, 50000),
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 2, name: 'Dólar', symbol: 'USD' },
    ] as never)

    const result = await getCompanyDonutRaw(makeParams([1]))

    expect(result[0]).toEqual({
      companyId: 1,
      companyName: 'SKANDIA',
      currencyId: 2,
      currencyName: 'Dólar',
      currencySymbol: 'USD',
      count: 1,
      totalValue: 50000,
    })
  })

  it('uses fallback symbol "#N" when currency not found in lookup', async () => {
    mockFindMany.mockResolvedValue([
      makeBusinessRow(1, 'SKANDIA', 99, 10000),
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([] as never)

    const result = await getCompanyDonutRaw(makeParams([1]))

    expect(result[0].currencyName).toBe('#99')
    expect(result[0].currencySymbol).toBe('#99')
  })

  it('defaults idCurrency to 1 (COP) when null on the business row', async () => {
    const rowWithNullCurrency = {
      ...makeBusinessRow(1, 'SKANDIA', 1, 10000),
      idCurrency: null,
    }
    mockFindMany.mockResolvedValue([rowWithNullCurrency] as never)
    mockCurrencyFindMany.mockResolvedValue([
      { idCurrency: 1, name: 'Peso colombiano', symbol: 'COP' },
    ] as never)

    const result = await getCompanyDonutRaw(makeParams([1]))

    expect(result[0].currencyId).toBe(1)
    expect(result[0].currencySymbol).toBe('COP')
  })

  it('scopes currency lookup to ids from businesses only', async () => {
    mockFindMany.mockResolvedValue([
      makeBusinessRow(1, 'SKANDIA', 5, 10000),
      makeBusinessRow(2, 'TRINITY', 7, 20000),
    ] as never)
    mockCurrencyFindMany.mockResolvedValue([] as never)

    await getCompanyDonutRaw(makeParams([1]))

    expect(mockCurrencyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idCurrency: { in: expect.arrayContaining([5, 7]) } },
      })
    )
  })
})
