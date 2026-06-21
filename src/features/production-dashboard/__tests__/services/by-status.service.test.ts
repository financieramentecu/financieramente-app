import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      groupBy: vi.fn(),
    },
  },
}))

// Mock ms-chart.service to isolate buildProductionWhereClause calls
vi.mock('../../services/ms-chart.service', () => ({
  buildProductionWhereClause: vi.fn(() => ({ idUser: { in: [1] } })),
}))

import { prisma } from '@/lib/prisma'
import { buildProductionWhereClause } from '../../services/ms-chart.service'
import { getBusinessesByStatusRaw } from '../../services/by-status.service'
import type { StatusDonutQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockGroupBy = vi.mocked(prisma.business.groupBy)
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

function makeParams(userIds: number[], filters = defaultFilters): StatusDonutQueryParams {
  return { userIds, appliedFilters: filters }
}

/** Minimal Prisma groupBy row shape returned by the service query */
function makeRow(status: string | null, count: number, idCurrency = 1, value = 0) {
  return { status, idCurrency, _count: { _all: count }, _sum: { value } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBusinessesByStatusRaw', () => {
  it('returns [] immediately when userIds is empty — no DB call', async () => {
    const result = await getBusinessesByStatusRaw(makeParams([]))
    expect(result).toEqual([])
    expect(mockGroupBy).not.toHaveBeenCalled()
  })

  it('calls prisma.business.groupBy with status IN filter for allowed statuses', async () => {
    mockGroupBy.mockResolvedValue([
      makeRow('VENTA_EFECTUADA', 10),
    ] as never)

    await getBusinessesByStatusRaw(makeParams([1]))

    expect(mockGroupBy).toHaveBeenCalledOnce()
    const callArgs = mockGroupBy.mock.calls[0][0] as Record<string, unknown>
    const where = callArgs.where as Record<string, unknown>
    const statusFilter = where.status as { in: string[] }
    expect(statusFilter.in).toContain('VENTA_EFECTUADA')
    expect(statusFilter.in).toContain('EMITIDO')
    expect(statusFilter.in).toContain('FONDEADO')
    expect(statusFilter.in).not.toContain('CANCELADO')
  })

  it('restricts status IN filter to the user-selected statuses, not all allowed statuses', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    const filters: DashboardAppliedFilters = { ...defaultFilters, statuses: ['EMITIDO'] }

    await getBusinessesByStatusRaw(makeParams([1], filters))

    const callArgs = mockGroupBy.mock.calls[0][0] as Record<string, unknown>
    const where = callArgs.where as Record<string, unknown>
    const statusFilter = where.status as { in: string[] }
    expect(statusFilter.in).toEqual(['EMITIDO'])
  })

  it('drops user-selected statuses that fall outside the donut allow-list', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    const filters: DashboardAppliedFilters = {
      ...defaultFilters,
      statuses: ['EMITIDO', 'CANCELADO'],
    }

    await getBusinessesByStatusRaw(makeParams([1], filters))

    const callArgs = mockGroupBy.mock.calls[0][0] as Record<string, unknown>
    const where = callArgs.where as Record<string, unknown>
    const statusFilter = where.status as { in: string[] }
    expect(statusFilter.in).toEqual(['EMITIDO'])
  })

  it('forwards filter params via buildProductionWhereClause', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    const params = makeParams([5, 6])

    await getBusinessesByStatusRaw(params)

    expect(mockBuildWhereClause).toHaveBeenCalledWith(params)
  })

  it('maps groupBy rows to StatusDonutRaw shape', async () => {
    mockGroupBy.mockResolvedValue([
      makeRow('EMITIDO', 42, 1, 5000000),
      makeRow('FONDEADO', 8, 2, 1000),
    ] as never)

    const result = await getBusinessesByStatusRaw(makeParams([1]))

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ status: 'EMITIDO', count: 42, currencyId: 1, totalValue: 5000000 })
    expect(result[1]).toEqual({ status: 'FONDEADO', count: 8, currencyId: 2, totalValue: 1000 })
  })

  it('filters out rows with null status from groupBy result', async () => {
    mockGroupBy.mockResolvedValue([
      makeRow(null, 5),
      makeRow('VENTA_EFECTUADA', 15),
    ] as never)

    const result = await getBusinessesByStatusRaw(makeParams([1]))

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('VENTA_EFECTUADA')
  })

  it('returns [] when groupBy returns empty array', async () => {
    mockGroupBy.mockResolvedValue([] as never)

    const result = await getBusinessesByStatusRaw(makeParams([1]))

    expect(result).toEqual([])
  })

  it('groups by status and idCurrency fields', async () => {
    mockGroupBy.mockResolvedValue([] as never)
    await getBusinessesByStatusRaw(makeParams([1]))
    const callArgs = mockGroupBy.mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.by).toEqual(['status', 'idCurrency'])
  })

  it('defaults currencyId to 1 (COP) when idCurrency is null', async () => {
    mockGroupBy.mockResolvedValue([
      { status: 'EMITIDO', idCurrency: null, _count: { _all: 10 }, _sum: { value: 0 } },
    ] as never)

    const result = await getBusinessesByStatusRaw(makeParams([1]))

    expect(result[0].currencyId).toBe(1)
  })

  it('converts null _sum.value to 0 via Number(null ?? 0)', async () => {
    mockGroupBy.mockResolvedValue([
      { status: 'FONDEADO', idCurrency: 1, _count: { _all: 5 }, _sum: { value: null } },
    ] as never)

    const result = await getBusinessesByStatusRaw(makeParams([1]))

    expect(result[0].totalValue).toBe(0)
  })
})
