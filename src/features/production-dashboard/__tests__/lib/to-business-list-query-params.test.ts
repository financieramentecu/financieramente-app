import { describe, it, expect } from 'vitest'
import { toBusinessListQueryParams } from '../../lib/to-business-list-query-params'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const baseFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2026-01-01T12:00:00Z'), end: new Date('2026-01-31T12:00:00Z') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function baseInput(overrides: Partial<Parameters<typeof toBusinessListQueryParams>[0]> = {}) {
  return {
    filters: baseFilters,
    idUser: 7,
    idCompany: 5,
    periodicityIdByName: new Map<string, number>(),
    page: 1,
    ...overrides,
  }
}

describe('toBusinessListQueryParams', () => {
  it('(a) maps dateRange to createdFrom/createdTo — never dateFrom/dateTo', () => {
    const params = toBusinessListQueryParams(baseInput())

    expect(params.get('createdFrom')).toBe('2026-01-01')
    expect(params.get('createdTo')).toBe('2026-01-31')
    expect(params.has('dateFrom')).toBe(false)
    expect(params.has('dateTo')).toBe(false)
  })

  it('(b) maps categoryIds to agentCategoryIds', () => {
    const params = toBusinessListQueryParams(
      baseInput({ filters: { ...baseFilters, categoryIds: [10, 11] } })
    )

    expect(params.getAll('agentCategoryIds')).toEqual(['10', '11'])
    expect(params.has('categoryIds')).toBe(false)
  })

  it('(c) maps plazos to terms', () => {
    const params = toBusinessListQueryParams(
      baseInput({ filters: { ...baseFilters, plazos: [12, 24] } })
    )

    expect(params.getAll('terms')).toEqual(['12', '24'])
    expect(params.has('plazos')).toBe(false)
  })

  it('(d) resolves periodicidades name to id via the provided map', () => {
    const periodicityIdByName = new Map([['Mensual', 3], ['Anual', 4]])
    const params = toBusinessListQueryParams(
      baseInput({
        filters: { ...baseFilters, periodicidades: ['Mensual', 'Anual'] },
        periodicityIdByName,
      })
    )

    expect(params.getAll('periodicityIds').sort()).toEqual(['3', '4'])
  })

  it('(d2) periodicidad name with no map entry is silently dropped (not sent as NaN)', () => {
    const periodicityIdByName = new Map([['Mensual', 3]])
    const params = toBusinessListQueryParams(
      baseInput({
        filters: { ...baseFilters, periodicidades: ['Mensual', 'Desconocida'] },
        periodicityIdByName,
      })
    )

    expect(params.getAll('periodicityIds')).toEqual(['3'])
  })

  it('(e) companyIds/productIds/originIds: productIds and originIds pass through from filters', () => {
    const params = toBusinessListQueryParams(
      baseInput({ filters: { ...baseFilters, productIds: [100], originIds: [200] } })
    )

    expect(params.getAll('productIds')).toEqual(['100'])
    expect(params.getAll('originIds')).toEqual(['200'])
  })

  it('(f) isInternacional is never forwarded', () => {
    const params = toBusinessListQueryParams(
      baseInput({ filters: { ...baseFilters, isInternacional: true } })
    )

    expect(params.has('isInternacional')).toBe(false)
  })

  it('(g) cell coordinates map to agentIds=[idUser] and companyIds=[idCompany]', () => {
    const params = toBusinessListQueryParams(
      baseInput({ idUser: 42, idCompany: 9, filters: { ...baseFilters, companyIds: [1, 2, 3] } })
    )

    expect(params.getAll('agentIds')).toEqual(['42'])
    // The cell's own company always wins — filters.companyIds is redundant
    // because the cell already exists within that company's aggregate.
    expect(params.getAll('companyIds')).toEqual(['9'])
  })

  it('(h) forwards statuses (repeated key) and page/pageSize/sort params', () => {
    const params = toBusinessListQueryParams(
      baseInput({ filters: { ...baseFilters, statuses: ['EMITIDO', 'FONDEADO'] }, page: 2 })
    )

    expect(params.getAll('statuses')).toEqual(['EMITIDO', 'FONDEADO'])
    expect(params.get('page')).toBe('2')
    expect(params.get('pageSize')).toBe('100')
    expect(params.get('sortBy')).toBe('createdAt')
    expect(params.get('sortOrder')).toBe('desc')
  })
})
